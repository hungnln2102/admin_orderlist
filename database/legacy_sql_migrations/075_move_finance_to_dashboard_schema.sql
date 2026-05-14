BEGIN;

-- Muc tieu:
-- Chuyen toan bo bang trong schema finance sang schema dashboard.
-- Idempotent de chay lai an toan.

CREATE SCHEMA IF NOT EXISTS dashboard;

DO $$
DECLARE
  rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'finance') THEN
    FOR rec IN
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'finance'
        AND table_type = 'BASE TABLE'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'dashboard'
          AND table_name = rec.table_name
      ) THEN
        EXECUTE format('ALTER TABLE finance.%I SET SCHEMA dashboard', rec.table_name);
      END IF;
    END LOOP;
  END IF;
END
$$;

-- Chuyen sequence thuoc schema finance (neu co) sang dashboard.
DO $$
DECLARE
  seq_rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'finance') THEN
    FOR seq_rec IN
      SELECT c.relname AS sequence_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'finance'
        AND c.relkind = 'S'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_class c2
        JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
        WHERE n2.nspname = 'dashboard'
          AND c2.relkind = 'S'
          AND c2.relname = seq_rec.sequence_name
      ) THEN
        EXECUTE format('ALTER SEQUENCE finance.%I SET SCHEMA dashboard', seq_rec.sequence_name);
      END IF;
    END LOOP;
  END IF;
END
$$;

COMMIT;
