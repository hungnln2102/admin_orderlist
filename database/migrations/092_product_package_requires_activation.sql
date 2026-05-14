-- Cấu hình loại gói: có hiển thị/bắt buộc trường «tài khoản kích hoạt» trên form package-product hay không.
-- Một product.id = một «loại gói» (Netflix…); package_product là từng dòng gói con.

ALTER TABLE product.product
  ADD COLUMN IF NOT EXISTS package_requires_activation boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN product.product.package_requires_activation IS
  'True: UI/form gói có trường kho kích hoạt (và match information_order cần storage).';

-- Gói đã có storage trước đây → coi như đã bật kích hoạt.
UPDATE product.product p
SET package_requires_activation = true
WHERE EXISTS (
  SELECT 1
  FROM product.package_product pp
  WHERE pp.package_id = p.id
    AND (pp.storage_id IS NOT NULL OR pp.storage_total IS NOT NULL)
);
