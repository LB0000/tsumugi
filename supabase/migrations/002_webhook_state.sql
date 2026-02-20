-- Migration: Webhook State Persistence
-- Purpose: Persist webhook event history and pending payments to survive server restarts
-- Related: server/lib/credits.ts webhook state tracking

-- ==================== Processed Webhook Events ====================

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at
  ON processed_webhook_events(processed_at);

ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON processed_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== Pending Payments ====================

CREATE TABLE IF NOT EXISTS pending_payments (
  payment_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_payments_created_at
  ON pending_payments(created_at);

CREATE INDEX IF NOT EXISTS idx_pending_payments_user_id
  ON pending_payments(user_id);

ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON pending_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== Comments ====================

COMMENT ON TABLE processed_webhook_events IS 'Webhook event deduplication (idempotency). TTL: 24 hours.';
COMMENT ON TABLE pending_payments IS 'Pending Square payments awaiting webhook completion. TTL: 2 hours.';
