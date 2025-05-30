<template>
  <div class="container">
    <el-row class="header-row" justify="center" align="middle">
      <el-col :span="24" class="text-center">
        <h1 class="header">商品价格追踪系统</h1>
      </el-col>
    </el-row>

    <el-row class="form-section" justify="center">
      <el-col :span="24">
        <h2>添加商品价格记录 <el-button type="primary" @click="onExport">导出</el-button></h2>
        <el-form ref="productForm" :model="productFormModel" :rules="productFormRules" label-width="90px" class="form">
          <el-form-item label="商品名称" prop="productName">
            <el-input v-model="productFormModel.productName" placeholder="请输入商品名称" />
          </el-form-item>

          <el-form-item label="日期" prop="priceDate">
            <el-date-picker v-model="productFormModel.priceDate" type="date" placeholder="选择日期" />
          </el-form-item>

          <el-form-item label="价格" prop="productPrice">
            <el-input v-model="productFormModel.productPrice" type="number" placeholder="请输入价格" />
          </el-form-item>

          <el-form-item label="商店" prop="storeName">
            <el-select v-model="productFormModel.storeName" placeholder="请选择或输入商店" filterable allow-create>
              <el-option v-for="(store, index) in storeList" :key="index" :label="store" :value="store" />
            </el-select>
          </el-form-item>

          <el-button type="primary" @click="saveRecord">保存记录</el-button>
        </el-form>
      </el-col>
    </el-row>

    <el-row class="chart-section" justify="center" align="middle">
      <el-col :span="24">
        <h2 class="chart-title">商品价格波动趋势</h2>
        <!-- 商品选择 -->
        <el-select v-model="selectedProduct" placeholder="选择商品" class="product-select" @change="updateChart">
          <el-option v-for="(store, index) in productNames" :key="index" :label="store" :value="store" />
        </el-select>
        <div id="priceTrendChart" class="chart-container"></div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import { getStores, getStoresProductNames, addPriceRecord, getAllPriceRecords } from './db.js';
import {exportToExcel} from './exportExcel.js'

// form ref
const productForm = ref(null)
const productFormModel = reactive({
  productName: '',
  priceDate: '',
  productPrice: null,
  storeName: '',
})
const productFormRules = reactive({
  productName: {
    required: true, message: '请输入商品名称', trigger: 'blur'
  },
  priceDate: {
    required: true, message: '选择日期', trigger: 'blur'
  },
  productPrice: {
    required: true, message: '请输入价格', trigger: 'blur'
  },
  storeName: {
    required: true, message: '请选择或输入商店', trigger: 'blur'
  },
})
// 存储所有历史输入的商店名称
const storeList = ref([]);
// 存储所有历史输入的商品名称
const productNames = ref([]);
// 选择的商品
const selectedProduct = ref('');
let chartInstance = null;

const resetForm = () => {
  if (!productForm.value) return
  productForm.value.resetFields()
}
// 保存本次填报数据
const saveRecord = async () => {
  if (!productForm.value) return
  await productForm.value.validate(async (valid, fields) => {
    if (valid) {
      await addPriceRecord({ ...productFormModel, id: new Date().getTime() })
      resetForm()
      ElMessage.success('新增成功');
      // 刷新商店列表
      fetchStores();
    } else {
      console.error('校验失败：', fields)
    }
  })
};

const updateChart = async () => {
  if (!selectedProduct.value) return;
  const allData = await getAllPriceRecords()
  const productData = allData.filter(item => item.productName === selectedProduct.value);
  if (productData.length) {
    if (!chartInstance) {
      chartInstance = echarts.init(document.getElementById('priceTrendChart'));
    }
    const xData = productData.map(item => new Date(item.priceDate).toLocaleDateString())  // 日期
    const yData = productData.map(item => item.productPrice)  // 价格
    const storeData = productData.map(item => item.storeName)  // 商店
    const option = {
      title: {
        text: `${selectedProduct.value} 价格波动趋势`,
        left: 'center',
        textStyle: {
          fontSize: 16,
        },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          // 这里可以定制 Tooltip 的内容
          const index = params[0].dataIndex;
          return `
            <div>
              <strong>日期:</strong> ${xData[index]}<br />
              <strong>价格:</strong> ${yData[index]}<br />
              <strong>商店:</strong> ${storeData[index] || '未知'}
            </div>
          `;
        },
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xData  // 日期
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: yData,  // 价格
          type: 'line',
          smooth: true,
          areaStyle: {}, // 添加渐变填充
        }
      ]
    };
    chartInstance.setOption(option);
  }
}
/* ======= 监听窗口变化，自适应图表 ======= */
const resizeHandler = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};
// 获取可选商店数据
const fetchStores = async () => {
  try {
    storeList.value = await getStores()
  } catch (error) {
    console.error('获取商店列表失败:', error.message);
  }
};
// 获取所有商品名称数据
const fetchNamesData = async () => {
  try {
    productNames.value = await getStoresProductNames()
  } catch (error) {
    console.error('获取商品名称数据失败：', error);
    
  }
}
// 导出
const onExport = async () => {
  await exportToExcel()
}
onMounted(() => {
  fetchStores();
  fetchNamesData();
  window.addEventListener('resize', resizeHandler);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler);
  if (chartInstance) {
    chartInstance.dispose();
  }
});

</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #f4f7fc;
  font-family: Arial, sans-serif;
}

.header {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.form-section {
  margin-top: 40px;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form {
  max-width: 600px;
  margin: 0 auto;
}

.save-btn {
  width: 100%;
  margin-top: 20px;
}

.chart-section {
  margin-top: 50px;
  background-color: #fff;
}

.chart-container {
  width: 100%;
  height: 400px;
  max-height: 70vh;
  /* 限制最大高度 */
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chart-title {
  text-align: center;
  font-size: 24px;
  color: #333;
  margin-bottom: 20px;
}

/* 优化商品选择下拉框样式 */
.product-select {
  width: 100%;
  max-width: 250px;
  margin: 0 auto 20px;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.product-select .el-input__inner {
  padding: 10px;
  font-size: 14px;
}

.product-select .el-input__inner:hover {
  border-color: #409EFF;
}

.product-select .el-select-dropdown {
  border-radius: 6px;
}

.product-select .el-select-dropdown__item {
  padding: 10px;
}

.product-select .el-select-dropdown__item:hover {
  background-color: #f5f7fa;
}

/* ----------- 响应式调整 ----------- */
@media (max-width: 768px) {
  .header {
    font-size: 26px;
  }

  .form-section {
    margin-top: 20px;
    padding: 15px;
  }

  .form {
    max-width: 100%;
  }

  .el-form-item {
    flex-wrap: wrap;
  }

  .el-form-item__label {
    width: 100% !important;
    text-align: left;
    margin-bottom: 5px;
  }

  .el-form-item__content {
    width: 100% !important;
  }

  .chart-container {
    height: 300px;
  }
}

@media (max-width: 576px) {
  .header {
    font-size: 20px;
  }

  .form-section {
    margin-top: 10px;
    padding: 10px;
  }

  .chart-title {
    font-size: 20px;
  }

  .chart-container {
    height: 250px;
  }

  .product-select {
    max-width: 100%;
  }
}
</style>
