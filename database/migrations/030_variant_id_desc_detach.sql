-- Tách variant.id_desc khỏi desc_variant: gỡ FK, cho phép NULL, xóa giá trị cột.
-- Sau đó TRUNCATE desc_variant nếu không còn bảng nào trỏ vào nó (chỉ áp dụng khi
-- toàn bộ variant đã id_desc IS NULL).

ALTER TABLE product.variant
  DROP CONSTRAINT IF EXISTS variant_id_desc_fkey;

ALTER TABLE product.variant
  DROP CONSTRAINT IF EXISTS variant_desc_variant_id_fkey;

ALTER TABLE product.variant
  ALTER COLUMN id_desc DROP NOT NULL;

UPDATE product.variant
SET id_desc = NULL
WHERE id_desc IS NOT NULL;

TRUNCATE TABLE product.desc_variant RESTART IDENTITY;

DROP INDEX IF EXISTS product.idx_variant_id_desc;
