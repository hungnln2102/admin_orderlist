BEGIN;

-- Mục tiêu:
-- 1) Chuẩn hóa schema identity mới thành customer_web
-- 2) Đưa audit.audit_logs vào cùng customer_web
-- 3) Idempotent để có thể chạy nhiều lần an toàn

CREATE SCHEMA IF NOT EXISTS customer_web;

-- Move toàn bộ bảng từ identity -> customer_web (nếu có và chưa trùng tên).
DO $$
DECLARE
  rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'identity') THEN
    FOR rec IN
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'identity'
        AND table_type = 'BASE TABLE'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'customer_web'
          AND table_name = rec.table_name
      ) THEN
        EXECUTE format('ALTER TABLE identity.%I SET SCHEMA customer_web', rec.table_name);
      END IF;
    END LOOP;
  END IF;
END
$$;

-- Move bảng audit_logs vào customer_web (nếu còn ở audit).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'audit'
      AND table_name = 'audit_logs'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'customer_web'
        AND table_name = 'audit_logs'
    ) THEN
      EXECUTE 'ALTER TABLE audit.audit_logs SET SCHEMA customer_web';
    END IF;
  END IF;
END
$$;

COMMIT;
