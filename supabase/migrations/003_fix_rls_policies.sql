-- Migration: Fix RLS policies on all tables
-- 旧ポリシーを削除し、TO service_role で統一

-- credit_balances
DROP POLICY IF EXISTS "Service role full access" ON credit_balances;
DROP POLICY IF EXISTS "service_role_only" ON credit_balances;
CREATE POLICY "service_role_only" ON credit_balances
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- credit_transactions
DROP POLICY IF EXISTS "Service role full access" ON credit_transactions;
DROP POLICY IF EXISTS "service_role_only" ON credit_transactions;
CREATE POLICY "service_role_only" ON credit_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- processed_webhook_events
DROP POLICY IF EXISTS "processed_webhook_events_service_role" ON processed_webhook_events;
DROP POLICY IF EXISTS "service_role_only" ON processed_webhook_events;
CREATE POLICY "service_role_only" ON processed_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- pending_payments
DROP POLICY IF EXISTS "pending_payments_service_role" ON pending_payments;
DROP POLICY IF EXISTS "service_role_only" ON pending_payments;
CREATE POLICY "service_role_only" ON pending_payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
