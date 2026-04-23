import * as SQLite from 'expo-sqlite';

export interface Product {
  id?: number;
  barcode: string;
  name: string;
  brand: string;
  image_url: string;
  quantity: string;
  categories: string;
  price: number;
  created_at?: string;
}

export type ProductInput = Omit<Product, 'id' | 'created_at'>;

const DATABASE_NAME = 'products.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbInstance;
}

export const initDatabase = async () => {
  const db = await getDb();
  
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      name TEXT,
      brand TEXT,
      image_url TEXT,
      quantity TEXT,
      categories TEXT,
      price REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  return db;
};

export const saveProduct = async (product: ProductInput) => {
  const db = await getDb();
  return await db.runAsync(
    `INSERT INTO products (barcode, name, brand, image_url, quantity, categories, price)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(barcode) DO UPDATE SET
       name = excluded.name,
       brand = excluded.brand,
       image_url = excluded.image_url,
       quantity = excluded.quantity,
       categories = excluded.categories,
       price = excluded.price`,
    [product.barcode, product.name, product.brand, product.image_url, product.quantity, product.categories, product.price]
  );
};

export const getAllProducts = async (): Promise<Product[]> => {
  const db = await getDb();
  return await db.getAllAsync<Product>('SELECT * FROM products ORDER BY created_at DESC');
};

export const getProductByBarcode = async (barcode: string): Promise<Product | null> => {
  const db = await getDb();
  return await db.getFirstAsync<Product>('SELECT * FROM products WHERE barcode = ?', [barcode]);
};

export const updateProduct = async (id: number, product: Partial<ProductInput>) => {
  const db = await getDb();
  return await db.runAsync(
    `UPDATE products SET 
      name = ?, 
      brand = ?, 
      quantity = ?, 
      categories = ?, 
      price = ? 
     WHERE id = ?`,
    [product.name, product.brand, product.quantity, product.categories, product.price, id]
  );
};

export const updateProductPrice = async (id: number, price: number) => {
  const db = await getDb();
  return await db.runAsync('UPDATE products SET price = ? WHERE id = ?', [price, id]);
};

export const deleteProduct = async (id: number) => {
  const db = await getDb();
  return await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
};

export const deleteAllProducts = async () => {
  const db = await getDb();
  return await db.runAsync('DELETE FROM products');
};
