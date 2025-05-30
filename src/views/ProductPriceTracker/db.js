// db.js
import { openDB } from 'idb';

const DB_NAME = 'price-tracker';
const STORE_NAME = 'prices';

export async function getDB() {
  return await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('productName', 'productName');
      }
    }
  });
}

export async function addPriceRecord(record) {
  const db = await getDB();
  await db.add(STORE_NAME, record);
}

export async function getAllPriceRecords() {
  const db = await getDB();
  return await db.getAll(STORE_NAME);
}

export async function getStores() {
  const records = await getAllPriceRecords();
  const storeSet = new Set(records.map(r => r.storeName));
  return Array.from(storeSet);
}
// 获取所有商品名称并去重复
export async function getStoresProductNames() {
  const records = await getAllPriceRecords();
  const storeSet = new Set(records.map(r => r.productName));
  return Array.from(storeSet);
}
