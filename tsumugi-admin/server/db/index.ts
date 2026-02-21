import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

const dbPath = config.DATABASE_URL.replace('file:', '');

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
    updated_at TEXT NOT NULL,
    marketing_opt_out_at TEXT
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

  CREATE TABLE IF NOT EXISTS strategic_goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    target_value REAL NOT NULL,
    current_value REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    deadline TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ad_spends (
    id TEXT PRIMARY KEY,
    channel TEXT NOT NULL,
    amount INTEGER NOT NULL,
    period TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue INTEGER DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS funnel_snapshots (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    visitors INTEGER DEFAULT 0,
    free_generations INTEGER DEFAULT 0,
    charges INTEGER DEFAULT 0,
    physical_purchases INTEGER DEFAULT 0,
    revenue INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS system_status (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    read_at TEXT
  );

  CREATE TABLE IF NOT EXISTS api_usage_logs (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    endpoint TEXT,
    status TEXT NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS automations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    status TEXT NOT NULL,
    steps TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS automation_enrollments (
    id TEXT PRIMARY KEY,
    automation_id TEXT NOT NULL REFERENCES automations(id),
    customer_id TEXT NOT NULL REFERENCES customers(id),
    current_step_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    trigger_data TEXT,
    next_send_at TEXT,
    enrolled_at TEXT NOT NULL,
    completed_at TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_automation_customer
    ON automation_enrollments(automation_id, customer_id)
    WHERE status = 'active';

  CREATE INDEX IF NOT EXISTS idx_enrollment_next_send
    ON automation_enrollments(next_send_at)
    WHERE status = 'active';

  CREATE TABLE IF NOT EXISTS action_plans (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES strategic_goals(id),
    title TEXT NOT NULL,
    description TEXT,
    action_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    config TEXT,
    executed_at TEXT,
    execution_result TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );
`);

function ensureColumn(table: string, column: string, definition: string): void {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: string }>;
  const exists = columns.some((c) => c.name === column);
  if (!exists) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('customers', 'marketing_opt_out_at', 'TEXT');
ensureColumn('email_sends', 'automation_id', 'TEXT');
