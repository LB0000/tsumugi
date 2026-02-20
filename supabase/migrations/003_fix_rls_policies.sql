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
