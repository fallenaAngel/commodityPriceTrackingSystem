const express = require('express');
const path = require('path');
const ExcelJS = require('exceljs');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3000;
let workbook = null;
// 允许来自 http://localhost:5173 的请求
// app.use(cors({
//   origin: 'http://localhost:5173',  // 或者可以使用 '*' 允许所有域
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
// }));
// 提供静态文件服务
const filePath = path.join(__dirname, 'dist/商品价格记录.xlsx');
app.use(express.static(path.join(__dirname, 'dist')));

// 解析 JSON 请求体
app.use(express.json());

// 读取文件并返回内容的接口
app.get('/api/read-excel', async (req, res) => {

  if (fs.existsSync(filePath)) {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const data = [];
    workbook.eachSheet((worksheet, sheetId) => {
      if (worksheet.name === '使用说明') {
        return;
      }
      const sheetData = [];
      // 遍历每一行
      worksheet.eachRow((row, rowNumber) => {
        // 假设第一行是标题行，跳过第一行
        if (rowNumber > 1) {
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            // 假设标题行是第一行，根据列号生成字段名
            const header = worksheet.getRow(1).getCell(colNumber).value;
            rowData[header] = cell.value;
          });
          sheetData.push(rowData);
        }
      });
      // 将当前工作表的数据加入到总数据中
      data.push({ sheetName: worksheet.name, rows: sheetData });
    });
    res.json({ data });
  } else {
    res.status(404).send('File not found');
  }
});

// 添加一行数据的接口
app.post('/api/add-row', async (req, res) => {
  const { productName, priceDate, productPrice, storeName } = req.body;
  const workbook = new ExcelJS.Workbook();

  if (fs.existsSync(filePath)) {
    await workbook.xlsx.readFile(filePath);
    let worksheet = workbook.getWorksheet(productName);
    if (!worksheet) {
      worksheet = workbook.addWorksheet(productName, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
      worksheet.addRow(['日期', '价格', '商店']); // 表头
    }
    worksheet.addRow([new Date(`${priceDate}`).toLocaleString(), productPrice, storeName]);

    await workbook.xlsx.writeFile(filePath);
    res.send('Row added successfully');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
