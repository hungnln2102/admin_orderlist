-- Migration: 021_banners_image_only
-- Banner trang chủ chỉ còn ảnh tĩnh — bỏ title, link_url.

BEGIN;

ALTER TABLE content.banners DROP COLUMN IF EXISTS title;
ALTER TABLE content.banners DROP COLUMN IF EXISTS link_url;

COMMIT;
