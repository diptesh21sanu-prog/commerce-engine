import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: Database | null = null;
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'marketplace.db');

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Enforce foreign key constraints
  dbInstance.run('PRAGMA foreign_keys = ON;');
  initSchema(dbInstance);
  try {
    dbInstance.run("ALTER TABLE shipments ADD COLUMN created_at TEXT;");
  } catch (e) {
    // Column already exists or table created with column
  }
  saveDb();
  return dbInstance;
}

let inTransactionDepth = 0;

export function saveDb(): void {
  if (!dbInstance || inTransactionDepth > 0) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

export function query<T = any>(sqlStr: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized. Call getDb() first.');
  const stmt = dbInstance.prepare(sqlStr);
  try {
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function queryOne<T = any>(sqlStr: string, params: any[] = []): T | null {
  const rows = query<T>(sqlStr, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sqlStr: string, params: any[] = []): { changes: number } {
  if (!dbInstance) throw new Error('Database not initialized. Call getDb() first.');
  dbInstance.run(sqlStr, params);
  if (inTransactionDepth === 0) {
    saveDb();
  }
  return { changes: dbInstance.getRowsModified() };
}

export function transaction<T>(fn: () => T): T {
  if (!dbInstance) throw new Error('Database not initialized');
  if (inTransactionDepth === 0) {
    dbInstance.run('BEGIN TRANSACTION;');
  }
  inTransactionDepth++;
  try {
    const result = fn();
    inTransactionDepth--;
    if (inTransactionDepth === 0) {
      dbInstance.run('COMMIT;');
      saveDb();
    }
    return result;
  } catch (err: any) {
    inTransactionDepth--;
    console.error('Detailed transaction error:', err?.message || err);
    try {
      if (inTransactionDepth === 0) {
        dbInstance.run('ROLLBACK;');
      }
    } catch (rbErr) {
      // ignore rollback error if already rolled back
    }
    throw err;
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer', 'seller', 'admin')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seller_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      store_name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'suspended', 'rejected')),
      commission_rate_basis_points INTEGER NOT NULL DEFAULT 1000,
      description TEXT,
      support_email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      brand TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft', 'pending_approval', 'published', 'archived')),
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      option1_name TEXT,
      option1_value TEXT,
      option2_name TEXT,
      option2_value TEXT,
      price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
      compare_at_price_cents INTEGER CHECK(compare_at_price_cents >= 0),
      weight_grams INTEGER DEFAULT 500,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory (
      variant_id TEXT PRIMARY KEY,
      stock_on_hand INTEGER NOT NULL CHECK(stock_on_hand >= 0),
      reserved_qty INTEGER NOT NULL DEFAULT 0 CHECK(reserved_qty >= 0),
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
      CONSTRAINT chk_stock_available CHECK(stock_on_hand >= reserved_qty)
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      url TEXT NOT NULL,
      alt_text TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shipping_zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_rate_cents INTEGER NOT NULL,
      free_threshold_cents INTEGER,
      estimated_days_min INTEGER NOT NULL,
      estimated_days_max INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'flat')),
      discount_value INTEGER NOT NULL CHECK(discount_value > 0),
      min_spend_cents INTEGER NOT NULL DEFAULT 0,
      max_discount_cents INTEGER,
      max_redemptions_global INTEGER NOT NULL DEFAULT 100,
      max_redemptions_per_user INTEGER NOT NULL DEFAULT 1,
      redemptions_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      entity_name TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      performed_by_user_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published', 'flagged', 'hidden')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      session_token TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      added_at TEXT NOT NULL,
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      street_address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'United States',
      phone TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory_reservations (
      id TEXT PRIMARY KEY,
      checkout_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'COMMITTED', 'EXPIRED', 'RELEASED')),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('CREATED', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
      subtotal_cents INTEGER NOT NULL,
      shipping_cents INTEGER NOT NULL,
      tax_cents INTEGER NOT NULL,
      discount_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      currency_rate REAL NOT NULL DEFAULT 1.0,
      payment_method TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seller_orders (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      suborder_number TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
      subtotal_cents INTEGER NOT NULL,
      commission_fee_cents INTEGER NOT NULL,
      seller_payout_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      seller_order_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      snapshot_title TEXT NOT NULL,
      snapshot_sku TEXT NOT NULL,
      snapshot_image TEXT,
      unit_price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total_price_cents INTEGER NOT NULL,
      tax_cents INTEGER NOT NULL DEFAULT 0,
      discount_cents INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (seller_order_id) REFERENCES seller_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );

    CREATE TABLE IF NOT EXISTS payment_attempts (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      transaction_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      error_code TEXT,
      raw_payload TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      seller_order_id TEXT UNIQUE NOT NULL,
      carrier TEXT NOT NULL,
      tracking_number TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('LABEL_CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION')),
      estimated_delivery_at TEXT,
      shipped_at TEXT,
      delivered_at TEXT,
      created_at TEXT,
      FOREIGN KEY (seller_order_id) REFERENCES seller_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shipment_events (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      seller_order_id TEXT NOT NULL,
      order_item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'REFUNDED')),
      requested_amount_cents INTEGER NOT NULL,
      approved_amount_cents INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (seller_order_id) REFERENCES seller_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (order_item_id) REFERENCES order_items(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS refund_attempts (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL,
      transaction_id TEXT UNIQUE NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seller_ledger (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      seller_order_id TEXT,
      entry_type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      balance_after_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id)
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_cart_proposals (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_token TEXT,
      variant_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      total_price_cents INTEGER NOT NULL,
      explanation TEXT,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'CONFIRMED', 'EXPIRED')),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
  `);
}
