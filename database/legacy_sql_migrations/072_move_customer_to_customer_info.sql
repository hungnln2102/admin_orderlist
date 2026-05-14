BEGIN;

-- Mục tiêu:
-- Chuyển các bảng thuộc schema customer -> customer_info.
-- Idempotent để chạy lại an toàn.

CREATE SCHEMA IF NOT EXISTS customer_info;

DO $$
DECLARE
  rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'customer') THEN
    FOR rec IN
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'customer'
        AND table_type = 'BASE TABLE'
        AND table_name IN (
          'customer_profiles',
          'customer_spend_stats',
          'customer_tiers',
          'customer_type_history'
        )
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'customer_info'
          AND table_name = rec.table_name
      ) THEN
        EXECUTE format('ALTER TABLE customer.%I SET SCHEMA customer_info', rec.table_name);
      END IF;
    END LOOP;
  END IF;
END
$$;

COMMIT;
