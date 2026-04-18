BEGIN;

-- Muc tieu:
-- Gom schema customer_info vao customer_web.
-- Chuyen cac bang customer_* tu customer_info -> customer_web (idempotent).

CREATE SCHEMA IF NOT EXISTS customer_web;

DO $$
DECLARE
  rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'customer_info') THEN
    FOR rec IN
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'customer_info'
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
        WHERE table_schema = 'customer_web'
          AND table_name = rec.table_name
      ) THEN
        EXECUTE format('ALTER TABLE customer_info.%I SET SCHEMA customer_web', rec.table_name);
      END IF;
    END LOOP;
  END IF;
END
$$;

COMMIT;
