-- Credit system tables for TSUMUGI
-- Migration: 001_credits.sql

-- ==================== credit_balances ====================
-- One row per user, tracks current credit balance

CREATE TABLE IF NOT EXISTS credit_balances (
  user_id TEXT PRIMARY KEY,
  free_remaining INTEGER NOT NULL DEFAULT 3,
  paid_remaining INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== credit_transactions ====================
-- Append-only audit log of all credit mutations

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('grant_free', 'purchase', 'consume', 'refund')),
  amount INTEGER NOT NULL,
  free_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  balance_after_free INTEGER NOT NULL,
  balance_after_paid INTEGER NOT NULL,
  reference_id TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id
  ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference_id
  ON credit_transactions(reference_id);

-- ==================== Row Level Security ====================
-- Service role only (accessed via server-side service role key)

ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON credit_balances
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON credit_transactions
  FOR ALL USING (true) WITH CHECK (true);
