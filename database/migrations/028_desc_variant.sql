-- Bảng nội dung mô tả / quy tắc / short_desc (có thể dùng chung cho nhiều variant).
-- product.variant.id_desc → product.desc_variant.id

CREATE TABLE IF NOT EXISTS product.desc_variant (
  id BIGSERIAL PRIMARY KEY,
  rules TEXT,
  description TEXT,
  short_desc TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE product.desc_variant IS
  'Mô tả chi tiết, rules, short_desc, ảnh SEO — nhiều variant có thể trỏ cùng một id.';

-- Khôi phục / đảm bảo image_url trên variant (bản migrate cũ có thể đã DROP; API dùng COALESCE với desc_variant).
ALTER TABLE product.variant
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Nullable trong lúc backfill; script migration sẽ điền dữ liệu rồi SET NOT NULL.
-- DB cũ có thể vẫn tên cột desc_variant_id; run-migration-028.js đổi tên / gộp sang id_desc.
ALTER TABLE product.variant
  ADD COLUMN IF NOT EXISTS id_desc BIGINT;
