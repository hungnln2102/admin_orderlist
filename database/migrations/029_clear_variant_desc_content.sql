-- Xóa nội dung mô tả (rules, description, short_desc, image_url) trên các bản ghi
-- product.desc_variant được variant.id_desc trỏ tới.
-- Lưu ý: Không xóa cột id_desc trên variant (FK + NOT NULL). Nếu nhiều variant
-- dùng chung một desc_variant.id, một lần UPDATE sẽ ảnh hưởng tất cả variant đó.

UPDATE product.desc_variant d
SET
  rules = NULL,
  description = NULL,
  short_desc = NULL,
  image_url = NULL,
  updated_at = now()
WHERE d.id IN (
  SELECT DISTINCT v.id_desc
  FROM product.variant v
  WHERE v.id_desc IS NOT NULL
);
