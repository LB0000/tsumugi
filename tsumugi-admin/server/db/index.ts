import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/tsumugi-admin.db';

const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Auto-create tables on first run
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS contents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    platform TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL,
    ai_prompt TEXT,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT,
    config TEXT,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL,
    discount_value REAL NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    campaign_id TEXT REFERENCES campaigns(id),
    expires_at TEXT,
    created_at TEXT NOT NULL,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    total_orders INTEGER DEFAULT 0,
    total_revenue INTEGER DEFAULT 0,
    unique_customers INTEGER DEFAULT 0,
    avg_order_value REAL DEFAULT 0,
    product_breakdown TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    tsumugi_user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    auth_provider TEXT NOT NULL,
    registered_at TEXT,
    first_purchase_at TEXT,
    last_purchase_at TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    segment TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_sends (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    sent_at TEXT,
    opened_at TEXT
  );
`);
