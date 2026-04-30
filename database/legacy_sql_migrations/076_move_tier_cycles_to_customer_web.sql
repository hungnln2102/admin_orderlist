BEGIN;

-- Muc tieu:
-- Chuyen cycles.tier_cycles -> customer_web.tier_cycles.
-- Idempotent de chay lai an toan.

CREATE SCHEMA IF NOT EXISTS customer_web;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'cycles'
      AND table_name = 'tier_cycles'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'customer_web'
      AND table_name = 'tier_cycles'
  ) THEN
    ALTER TABLE cycles.tier_cycles SET SCHEMA customer_web;
  END IF;
END
$$;

COMMIT;
