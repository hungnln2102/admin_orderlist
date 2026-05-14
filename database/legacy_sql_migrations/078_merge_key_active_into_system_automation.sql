BEGIN;

-- Muc tieu:
-- Gom schema key_active vao system_automation.
-- Chuyen toan bo bang key_active -> system_automation (idempotent).

CREATE SCHEMA IF NOT EXISTS system_automation;

DO $$
DECLARE
  rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'key_active') THEN
    FOR rec IN
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'key_active'
        AND table_type = 'BASE TABLE'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'system_automation'
          AND table_name = rec.table_name
      ) THEN
        EXECUTE format('ALTER TABLE key_active.%I SET SCHEMA system_automation', rec.table_name);
      END IF;
    END LOOP;
  END IF;
END
$$;

-- Chuyen sequence thuoc schema key_active (neu co) sang system_automation.
DO $$
DECLARE
  seq_rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'key_active') THEN
    FOR seq_rec IN
      SELECT c.relname AS sequence_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'key_active'
        AND c.relkind = 'S'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_class c2
        JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
        WHERE n2.nspname = 'system_automation'
          AND c2.relkind = 'S'
          AND c2.relname = seq_rec.sequence_name
      ) THEN
        EXECUTE format('ALTER SEQUENCE key_active.%I SET SCHEMA system_automation', seq_rec.sequence_name);
      END IF;
    END LOOP;
  END IF;
END
$$;

COMMIT;
