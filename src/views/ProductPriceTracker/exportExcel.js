import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getAllPriceRecords } from './db';

export async function exportToExcel() {
  const workbook = new ExcelJS.Workbook();

  const records = await getAllPriceRecords();

  const grouped = {};
  for (const r of records) {
    if (!grouped[r.productName]) grouped[r.productName] = [];
    grouped[r.productName].push(r);
  }

  for (const [productName, rows] of Object.entries(grouped)) {
    const sheet = workbook.addWorksheet(productName);
    sheet.addRow(['日期', '价格', '商店']);
    rows.forEach(r => {
      sheet.addRow([r.priceDate, r.productPrice, r.storeName]);
    });
  }

  const blob = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([blob]), '商品价格记录.xlsx');
}
