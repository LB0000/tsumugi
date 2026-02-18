-- Migration: Webhook State Persistence (CRITICAL-1 FIX)
-- Purpose: Persist webhook event history and pending payments to survive server restarts
-- Related: server/lib/credits.ts webhook state tracking

-- ==================== Processed Webhook Events ====================

-- Store processed webhook event IDs for idempotency (prevent duplicate processing)
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for TTL cleanup (remove events older than 24h)
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at
  ON processed_webhook_events(processed_at);

-- RLS: Service role only (no user access)
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY processed_webhook_events_service_role
  ON processed_webhook_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ==================== Pending Payments ====================

-- Track payments that are PENDING (not yet COMPLETED) for webhook processing
-- When a payment is created but Square returns status != 'COMPLETED',
-- we track it here so the webhook can grant credits when it completes later
CREATE TABLE IF NOT EXISTS pending_payments (
  payment_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for TTL cleanup (remove payments older than 2h)
CREATE INDEX IF NOT EXISTS idx_pending_payments_created_at
  ON pending_payments(created_at);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_pending_payments_user_id
  ON pending_payments(user_id);

-- RLS: Service role only (no user access)
ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY pending_payments_service_role
  ON pending_payments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ==================== Comments ====================

COMMENT ON TABLE processed_webhook_events IS 'Webhook event deduplication (idempotency). TTL: 24 hours.';
COMMENT ON TABLE pending_payments IS 'Pending Square payments awaiting webhook completion. TTL: 2 hours.';
