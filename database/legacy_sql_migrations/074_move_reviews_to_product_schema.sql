BEGIN;

-- Mục tiêu:
-- Chuyển bảng review.reviews sang product.reviews.
-- Idempotent để chạy lại an toàn.

CREATE SCHEMA IF NOT EXISTS product;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'review'
      AND table_name = 'reviews'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'product'
      AND table_name = 'reviews'
  ) THEN
    ALTER TABLE review.reviews SET SCHEMA product;
  END IF;
END
$$;

-- Di chuyển sequence (nếu có) do cột của product.reviews sở hữu.
DO $$
DECLARE
  seq_record RECORD;
BEGIN
  FOR seq_record IN
    SELECT ns.nspname AS sequence_schema, s.relname AS sequence_name
    FROM pg_class t
    JOIN pg_namespace tn ON tn.oid = t.relnamespace
    JOIN pg_depend d ON d.refobjid = t.oid AND d.deptype = 'a'
    JOIN pg_class s ON s.oid = d.objid AND s.relkind = 'S'
    JOIN pg_namespace ns ON ns.oid = s.relnamespace
    WHERE tn.nspname = 'product'
      AND t.relname = 'reviews'
      AND ns.nspname = 'review'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class s2
      JOIN pg_namespace ns2 ON ns2.oid = s2.relnamespace
      WHERE ns2.nspname = 'product'
        AND s2.relname = seq_record.sequence_name
        AND s2.relkind = 'S'
    ) THEN
      EXECUTE format(
        'ALTER SEQUENCE %I.%I SET SCHEMA product',
        seq_record.sequence_schema,
        seq_record.sequence_name
      );
    END IF;
  END LOOP;
END
$$;

COMMIT;
