-- Migration: 031_banners_hero_full
-- Khôi phục / bổ sung model hero: tiêu đề, mô tả, nhãn, alt ảnh, nút CTA (tùy chọn).

BEGIN;

ALTER TABLE content.banners ADD COLUMN IF NOT EXISTS title VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE content.banners ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE content.banners ADD COLUMN IF NOT EXISTS tag_text VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE content.banners ADD COLUMN IF NOT EXISTS image_alt VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE content.banners ADD COLUMN IF NOT EXISTS button_label VARCHAR(200);
ALTER TABLE content.banners ADD COLUMN IF NOT EXISTS button_href TEXT;

COMMIT;
