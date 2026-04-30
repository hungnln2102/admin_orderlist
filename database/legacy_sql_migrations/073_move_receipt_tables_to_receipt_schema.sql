BEGIN;

-- Mục tiêu:
-- Gom các bảng biên lai sang schema receipt:
-- - payment_receipt
-- - payment_receipt_financial_state
-- - payment_receipt_financial_audit_log
-- Script idempotent, chạy lại an toàn.

CREATE SCHEMA IF NOT EXISTS receipt;

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'orders'
      AND table_type = 'BASE TABLE'
      AND table_name IN (
        'payment_receipt',
        'payment_receipt_financial_state',
        'payment_receipt_financial_audit_log'
      )
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'receipt'
        AND table_name = rec.table_name
    ) THEN
      EXECUTE format('ALTER TABLE orders.%I SET SCHEMA receipt', rec.table_name);
    END IF;
  END LOOP;
END
$$;

COMMIT;
