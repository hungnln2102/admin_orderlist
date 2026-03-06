-- Migration: 007_product_and_supplier_cost_audit_columns
-- Mô tả:
--   - Bảng product: thêm name, updated_at, is_active.
--   - Bảng variant: thêm updated_at, bổ sung FK sang product.
--   - Bảng product_desc: thêm updated_at.
--   - Bảng supplier_cost: thêm created_at, updated_at (hỗ trợ audit).
--
-- Lưu ý:
--   - Không rename cột package_name hiện tại (đang được dùng nhiều trong code);
--     chỉ thêm cột name để dùng dần sau này.
--   - Constraint FK / UNIQUE được tạo có điều kiện, an toàn khi chạy nhiều lần.
--
-- Chạy:
--   psql "$DATABASE_URL" -f database/migrations/007_product_and_supplier_cost_audit_columns.sql
--

BEGIN;

-- 1) PRODUCT.PRODUCT: thêm name, updated_at, is_active
ALTER TABLE product.product
  ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE product.product
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE product.product
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN product.product.name IS 'Tên sản phẩm hiển thị; dần thay thế cho package_name nếu cần.';
COMMENT ON COLUMN product.product.updated_at IS 'Thời điểm cập nhật bản ghi gần nhất.';
COMMENT ON COLUMN product.product.is_active IS 'Cờ kích hoạt sản phẩm (true = đang sử dụng).';


-- 2) PRODUCT.VARIANT: thêm updated_at, FK sang product(id)
ALTER TABLE product.variant
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

COMMENT ON COLUMN product.variant.updated_at IS 'Thời điểm cập nhật variant gần nhất.';

DO $$
BEGIN
  -- Thêm FK variant.product_id -> product.id nếu chưa tồn tại
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'variant_product_fk'
      AND c.conrelid = 'product.variant'::regclass
  ) THEN
    ALTER TABLE product.variant
      ADD CONSTRAINT variant_product_fk
      FOREIGN KEY (product_id) REFERENCES product.product(id);
  END IF;
END
$$;


-- 3) PRODUCT_DESC: thêm updated_at
ALTER TABLE product.product_desc
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

COMMENT ON COLUMN product.product_desc.updated_at IS 'Thời điểm cập nhật mô tả sản phẩm gần nhất.';


-- 4) SUPPLIER_COST: thêm created_at, updated_at cho mọi schema có bảng supplier_cost
DO $$
BEGIN
  -- product.supplier_cost (nếu tồn tại)
  IF to_regclass('product.supplier_cost') IS NOT NULL THEN
    ALTER TABLE product.supplier_cost
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
  END IF;

  -- partner.supplier_cost (nếu tồn tại)
  IF to_regclass('partner.supplier_cost') IS NOT NULL THEN
    ALTER TABLE partner.supplier_cost
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
  END IF;

  -- supplier_cost.supplier_cost (nếu dùng schema riêng)
  IF to_regclass('supplier_cost.supplier_cost') IS NOT NULL THEN
    ALTER TABLE supplier_cost.supplier_cost
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
  END IF;
END
$$;

COMMIT;

