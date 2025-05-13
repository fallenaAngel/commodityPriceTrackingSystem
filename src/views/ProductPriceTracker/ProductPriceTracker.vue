<template>
  <div class="container">
    <el-row class="header-row" justify="center" align="middle">
      <el-col :span="24" class="text-center">
        <h1 class="header">商品价格追踪系统</h1>
      </el-col>
    </el-row>

    <el-row class="form-section" justify="center">
      <el-col :span="24">
        <h2>添加商品价格记录</h2>
        <el-form label-width="90px" class="form">
          <el-form-item label="商品名称">
            <el-input v-model="productName" placeholder="请输入商品名称" />
          </el-form-item>

          <el-form-item label="日期">
            <el-date-picker v-model="priceDate" type="date" placeholder="选择日期" />
          </el-form-item>

          <el-form-item label="价格">
            <el-input v-model="productPrice" type="number" placeholder="请输入价格" />
          </el-form-item>

          <el-form-item label="商店">
            <el-select v-model="storeName" placeholder="请选择或输入商店" filterable allow-create>
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
          <el-option v-for="item in productList" :key="item.name" :label="item.name" :value="item.name" />
        </el-select>
        <div id="priceTrendChart" class="chart-container"></div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';

const productName = ref('');
const priceDate = ref('');
const productPrice = ref(null);
const storeName = ref('');
const storeList = ref([]); // 存储所有历史输入的商店名称
const selectedProduct = ref('');  // 选择的商品
const productList = ref([]);
let chartInstance = null;

const saveRecord = async () => {
  fetch('/api/add-row', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productName: productName.value, priceDate: priceDate.value, productPrice: productPrice.value, storeName: storeName.value })
  }).then(data => {
    if (data.ok) {
      // 清空输入框
      productName.value = '';
      priceDate.value = '';
      productPrice.value = null;
      storeName.value = '';
      // 提示新增成功
      ElMessage.success('新增成功');
      // 刷新商店列表
      fetchStores();
    }
  })
};

const getExistingData = async () => {
  fetch('/api/read-excel').then(response => response.json()).then(data => {
    data.data.forEach(v => {
      if (productList.value.some(item => item.name === v.sheetName)) return;
      productList.value.push({ name: v.sheetName, data: v.rows.map(item => [item['日期'], item['价格'], item['商店']]) })
    })
  })
}
const updateChart = async () => {
  if (!selectedProduct.value) return;
  await getExistingData();
  const productData = productList.value.find(item => item.name === selectedProduct.value)?.data;
  if (productData) {
    if (!chartInstance) {
      chartInstance = echarts.init(document.getElementById('priceTrendChart'));
    }
    const xData = productData.map(item => new Date(item[0]).toLocaleDateString())  // 日期
    const yData = productData.map(item => item[1])  // 价格
    const storeData = productData.map(item => item[2])  // 商店
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
const fetchStores = async () => {
  try {
    const response = await fetch('/api/get-stores');
    const data = await response.json();
    storeList.value = data.stores;
  } catch (error) {
    console.error('获取商店列表失败:', error.message);
  }
};
onMounted(() => {
  fetchStores();
  window.addEventListener('resize', resizeHandler);
  // 获取已有的商品和价格数据
  getExistingData();
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
  max-height: 70vh;/* 限制最大高度 */
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

