-- Migration: 020_create_content_schema
-- Mô tả:
--   Tạo schema "content" với 3 bảng:
--     1. article_categories – danh mục bài viết
--     2. articles           – bài viết / tin tức
--     3. banners            – banner hero trang chủ (ảnh + tiêu đề, mô tả, CTA tùy chọn)

BEGIN;

CREATE SCHEMA IF NOT EXISTS content;

-- =============================================
-- 1. Danh mục bài viết
-- =============================================
CREATE TABLE IF NOT EXISTS content.article_categories (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(120) NOT NULL UNIQUE,
  description   TEXT DEFAULT '',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_categories_slug
  ON content.article_categories (slug);

-- =============================================
-- 2. Bài viết
-- =============================================
CREATE TABLE IF NOT EXISTS content.articles (
  id            SERIAL PRIMARY KEY,
  category_id   INTEGER REFERENCES content.article_categories(id) ON DELETE SET NULL,
  title         VARCHAR(500) NOT NULL,
  slug          VARCHAR(500) NOT NULL UNIQUE,
  summary       TEXT DEFAULT '',
  content       TEXT DEFAULT '',
  image_url     TEXT DEFAULT '',
  status        VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published')),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug
  ON content.articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_category_id
  ON content.articles (category_id);
CREATE INDEX IF NOT EXISTS idx_articles_status
  ON content.articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON content.articles (published_at DESC NULLS LAST);

-- =============================================
-- 3. Banner trang chủ
-- =============================================
CREATE TABLE IF NOT EXISTS content.banners (
  id              SERIAL PRIMARY KEY,
  image_url       TEXT NOT NULL DEFAULT '',
  title           VARCHAR(500) NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  tag_text        VARCHAR(120) NOT NULL DEFAULT '',
  image_alt       VARCHAR(500) NOT NULL DEFAULT '',
  button_label    VARCHAR(200),
  button_href     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_active_order
  ON content.banners (active, sort_order);

-- =============================================
-- Seed danh mục mặc định (nếu bảng trống)
-- =============================================
INSERT INTO content.article_categories (name, slug, sort_order)
SELECT n, s, o FROM (VALUES
  ('Hướng dẫn',     'huong-dan',      1),
  ('Nội bộ',        'noi-bo',         2),
  ('Danh mục',      'danh-muc',       3),
  ('Bán chạy',      'ban-chay',       4),
  ('Sản phẩm mới',  'san-pham-moi',   5),
  ('Khuyến mãi',    'khuyen-mai',     6)
) AS v(n, s, o)
WHERE NOT EXISTS (SELECT 1 FROM content.article_categories LIMIT 1);

COMMIT;
