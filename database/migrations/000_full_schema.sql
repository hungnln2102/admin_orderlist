-- ============================================================================
-- FULL DATABASE SCHEMA — admin_orderlist
-- Tổng hợp từ migration 001 → 033 + schema gốc.
-- Tạo mới từ đầu: chạy file này trên DB trống.
-- Đã chạy rồi: KHÔNG chạy lại (sẽ conflict).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SCHEMA: orders
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS orders;

CREATE TABLE IF NOT EXISTS orders.order_list (
  id              SERIAL PRIMARY KEY,
  id_order        VARCHAR(50),
  id_product      VARCHAR(255),
  information_order TEXT,
  customer        VARCHAR(255),
  contact         VARCHAR(255),
  slot            VARCHAR(100),
  order_date      DATE,
  days            INTEGER,
  expired_at      DATE,
  supply_id       INTEGER,
  cost            NUMERIC(18,2),
  price           NUMERIC(18,2),
  note            TEXT,
  status          VARCHAR(50),
  refund          NUMERIC(18,2),
  canceled_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_list_id_order_unique
  ON orders.order_list (UPPER(id_order))
  WHERE id_order IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_list_status_expired
  ON orders.order_list(status, expired_at)
  WHERE status IS NOT NULL AND expired_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_list_order_date
  ON orders.order_list(order_date)
  WHERE order_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS orders.order_expired (
  id              SERIAL PRIMARY KEY,
  id_order        VARCHAR(50),
  id_product      VARCHAR(255),
  information_order TEXT,
  customer        VARCHAR(255),
  contact         VARCHAR(255),
  slot            VARCHAR(100),
  order_date      DATE,
  days            INTEGER,
  expired_at      DATE,
  supply_id       INTEGER,
  cost            NUMERIC(18,2),
  price           NUMERIC(18,2),
  note            TEXT,
  status          VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_order_expired_order_date
  ON orders.order_expired(order_date)
  WHERE order_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS orders.order_canceled (
  id              SERIAL PRIMARY KEY,
  id_order        VARCHAR(50),
  id_product      VARCHAR(255),
  information_order TEXT,
  customer        VARCHAR(255),
  contact         VARCHAR(255),
  slot            VARCHAR(100),
  order_date      DATE,
  days            INTEGER,
  expired_at      DATE,
  supply_id       INTEGER,
  cost            NUMERIC(18,2),
  price           NUMERIC(18,2),
  note            TEXT,
  status          VARCHAR(50),
  createdate      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_order_canceled_created_at
  ON orders.order_canceled(createdate)
  WHERE createdate IS NOT NULL;

CREATE TABLE IF NOT EXISTS orders.payment_receipt (
  id              SERIAL PRIMARY KEY,
  id_order        VARCHAR(50),
  payment_date    DATE,
  amount          NUMERIC(18,2),
  receiver        VARCHAR(255),
  note            TEXT,
  sender          TEXT
);

CREATE TABLE IF NOT EXISTS orders.refund (
  id              SERIAL PRIMARY KEY,
  ma_don_hang     VARCHAR(50),
  ngay_thanh_toan DATE,
  so_tien         NUMERIC(18,2)
);

CREATE TABLE IF NOT EXISTS orders.sales_summary (
  id              SERIAL PRIMARY KEY,
  summary_date    DATE NOT NULL UNIQUE,
  total_orders    INTEGER DEFAULT 0,
  total_revenue   NUMERIC(12,2) DEFAULT 0,
  total_cost      NUMERIC(12,2) DEFAULT 0,
  total_profit    NUMERIC(12,2) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_summary_date
  ON orders.sales_summary(summary_date DESC);

-- ============================================================================
-- 2. SCHEMA: product
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS product;

CREATE TABLE IF NOT EXISTS product.product (
  id              SERIAL PRIMARY KEY,
  package_name    VARCHAR(255),
  image_url       TEXT,
  name            TEXT,
  updated_at      TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product.category (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  color           VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product.product_category (
  product_id      INTEGER NOT NULL REFERENCES product.product(id),
  category_id     INTEGER NOT NULL REFERENCES product.category(id),
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS product.desc_variant (
  id              BIGSERIAL PRIMARY KEY,
  rules           TEXT,
  description     TEXT,
  short_desc      TEXT,
  image_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product.variant (
  id              SERIAL PRIMARY KEY,
  product_id      INTEGER REFERENCES product.product(id),
  variant_name    VARCHAR(255),
  is_active       BOOLEAN DEFAULT TRUE,
  display_name    VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  form_id         INTEGER,
  updated_at      TIMESTAMPTZ,
  id_desc         BIGINT,
  image_url       TEXT,
  base_price      NUMERIC(18,2)
);

CREATE TABLE IF NOT EXISTS product.pricing_tier (
  id              SERIAL PRIMARY KEY,
  key             VARCHAR(30) UNIQUE NOT NULL,
  prefix          VARCHAR(10) UNIQUE NOT NULL,
  label           VARCHAR(100) NOT NULL,
  pricing_rule    VARCHAR(20) NOT NULL
                  CHECK (pricing_rule IN ('markup', 'discount', 'fixed_zero', 'cost')),
  base_tier_key   VARCHAR(30) REFERENCES product.pricing_tier(key),
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO product.pricing_tier (key, prefix, label, pricing_rule, base_tier_key, sort_order)
VALUES
  ('ctv',      'MAVC', 'Cộng Tác Viên', 'markup',     NULL,        1),
  ('customer', 'MAVL', 'Khách Lẻ',      'markup',     'ctv',       2),
  ('promo',    'MAVK', 'Khuyến Mãi',    'discount',   'customer',  3),
  ('student',  'MAVS', 'Sinh Viên',     'markup',     'ctv',       4),
  ('gift',     'MAVT', 'Quà Tặng',      'fixed_zero',  NULL,       5),
  ('import',   'MAVN', 'Nhập Hàng',     'cost',        NULL,       6)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS product.variant_margin (
  variant_id      INT NOT NULL REFERENCES product.variant(id) ON DELETE CASCADE,
  tier_id         INT NOT NULL REFERENCES product.pricing_tier(id) ON DELETE CASCADE,
  margin_ratio    NUMERIC(12,6),
  PRIMARY KEY (variant_id, tier_id)
);

CREATE INDEX IF NOT EXISTS idx_variant_margin_variant
  ON product.variant_margin(variant_id);

CREATE TABLE IF NOT EXISTS product.package_product (
  id              SERIAL PRIMARY KEY,
  package_id      INTEGER,
  supplier        VARCHAR(255),
  cost            NUMERIC(18,2),
  slot            VARCHAR(100),
  match           VARCHAR(255),
  stock_id        INTEGER,
  storage_id      INTEGER,
  storage_total   INTEGER
);

CREATE TABLE IF NOT EXISTS product.product_stocks (
  id              SERIAL PRIMARY KEY,
  product_type    VARCHAR(100),
  account_username VARCHAR(255),
  backup_email    VARCHAR(255),
  password_encrypted TEXT,
  two_fa_encrypted TEXT,
  status          VARCHAR(50),
  expires_at      TIMESTAMPTZ,
  is_verified     BOOLEAN DEFAULT FALSE,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. SCHEMA: partner
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS partner;

CREATE TABLE IF NOT EXISTS partner.supplier (
  id              SERIAL PRIMARY KEY,
  supplier_name   VARCHAR(255),
  number_bank     VARCHAR(100),
  bin_bank        VARCHAR(100),
  account_holder  VARCHAR(255),
  active_supply   VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS partner.supplier_payments (
  id              SERIAL PRIMARY KEY,
  supplier_id     INTEGER REFERENCES partner.supplier(id),
  total_amount    NUMERIC(18,2),
  payment_period  VARCHAR(50),
  payment_status  VARCHAR(50),
  amount_paid     NUMERIC(18,2)
);

CREATE INDEX IF NOT EXISTS idx_payment_supply_source_status
  ON partner.supplier_payments(supplier_id, payment_status)
  WHERE supplier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_supply_source_id
  ON partner.supplier_payments(supplier_id)
  WHERE supplier_id IS NOT NULL;

-- supplier_cost: có thể nằm ở product hoặc partner tùy env
CREATE TABLE IF NOT EXISTS product.supplier_cost (
  id              SERIAL PRIMARY KEY,
  variant_id      INTEGER REFERENCES product.variant(id),
  supplier_id     INTEGER REFERENCES partner.supplier(id),
  price           NUMERIC(18,2),
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
);

-- FK: order_list.supply_id → partner.supplier(id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_list_supply_id_fk'
  ) THEN
    ALTER TABLE orders.order_list
      ADD CONSTRAINT order_list_supply_id_fk
      FOREIGN KEY (supply_id) REFERENCES partner.supplier(id);
  END IF;
END $$;

-- ============================================================================
-- 4. SCHEMA: admin
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS admin;

CREATE TABLE IF NOT EXISTS admin.users (
  userid          SERIAL PRIMARY KEY,
  username        VARCHAR(100) NOT NULL UNIQUE,
  passwordhash    TEXT NOT NULL,
  role            VARCHAR(50) DEFAULT 'user',
  createdat       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin.ip_whitelist (
  id              BIGSERIAL PRIMARY KEY,
  ip_address      VARCHAR(128) NOT NULL UNIQUE,
  label           VARCHAR(100),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_whitelist_created_at
  ON admin.ip_whitelist(created_at DESC);

CREATE TABLE IF NOT EXISTS admin.site_settings (
  key             VARCHAR(50) PRIMARY KEY,
  value           TEXT NOT NULL DEFAULT '',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin.site_settings (key, value)
VALUES ('maintenance_mode', 'off')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 5. SCHEMA: finance
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS finance;

CREATE TABLE IF NOT EXISTS finance.master_wallettypes (
  id              SERIAL PRIMARY KEY,
  wallet_name     VARCHAR(255),
  note            TEXT,
  asset_code      VARCHAR(50),
  is_investment   BOOLEAN DEFAULT FALSE,
  linked_wallet_id INTEGER,
  balance_scope   VARCHAR(20) NOT NULL DEFAULT 'per_row'
                  CHECK (balance_scope IN ('per_row', 'column_total'))
);

CREATE TABLE IF NOT EXISTS finance.trans_dailybalances (
  id              SERIAL PRIMARY KEY,
  record_date     DATE,
  wallet_id       INTEGER REFERENCES finance.master_wallettypes(id),
  amount          NUMERIC(18,2)
);

CREATE TABLE IF NOT EXISTS finance.saving_goals (
  id              SERIAL PRIMARY KEY,
  goal_name       VARCHAR(255),
  target_amount   NUMERIC(18,2),
  priority        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.dashboard_monthly_summary (
  month_key       VARCHAR(7) PRIMARY KEY
                  CHECK (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  total_orders    INTEGER NOT NULL DEFAULT 0,
  canceled_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue   NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_profit    NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_refund    NUMERIC(18,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_monthly_summary_updated_at
  ON finance.dashboard_monthly_summary(updated_at DESC);

-- ============================================================================
-- 6. SCHEMA: identity
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS identity;

CREATE TABLE IF NOT EXISTS identity.roles (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS identity.mail_backup (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) NOT NULL,
  app_password    TEXT,
  note            TEXT,
  provider        VARCHAR(50),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  alias_prefix    VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS identity.accounts (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  username        VARCHAR(100),
  suspended_until TIMESTAMPTZ,
  ban_reason      TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  role_id         INTEGER REFERENCES identity.roles(id),
  mail_backup_id  INTEGER REFERENCES identity.mail_backup(id)
);

CREATE TABLE IF NOT EXISTS identity.customer_profiles (
  id              SERIAL PRIMARY KEY,
  account_id      INTEGER REFERENCES identity.accounts(id),
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  date_of_birth   DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  tier_id         INTEGER
);

-- ============================================================================
-- 7. SCHEMA: common
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS common;

CREATE TABLE IF NOT EXISTS common.status (
  code            VARCHAR(50) PRIMARY KEY,
  label_vi        VARCHAR(100),
  label_en        VARCHAR(100),
  description     TEXT,
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 8. SCHEMA: promotion
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS promotion;

CREATE TABLE IF NOT EXISTS promotion.promotion_codes (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(50) NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2),
  max_discount_amount NUMERIC(18,2),
  min_order_amount NUMERIC(18,2),
  description     TEXT,
  status          VARCHAR(20) DEFAULT 'active',
  is_public       BOOLEAN DEFAULT FALSE,
  usage_limit     INTEGER,
  used_count      INTEGER DEFAULT 0,
  start_at        TIMESTAMPTZ,
  end_at          TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotion.account_promotions (
  id              SERIAL PRIMARY KEY,
  account_id      INTEGER,
  promotion_id    INTEGER REFERENCES promotion.promotion_codes(id),
  status          VARCHAR(20) DEFAULT 'assigned',
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  used_at         TIMESTAMPTZ,
  usage_limit_per_user INTEGER DEFAULT 1
);

-- ============================================================================
-- 9. SCHEMA: wallet
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS wallet;

CREATE TABLE IF NOT EXISTS wallet.wallets (
  account_id      INTEGER PRIMARY KEY,
  balance         NUMERIC(18,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet.wallet_transactions (
  id              SERIAL PRIMARY KEY,
  transaction_id  VARCHAR(100) UNIQUE,
  account_id      INTEGER REFERENCES wallet.wallets(account_id),
  type            VARCHAR(50),
  direction       VARCHAR(10) CHECK (direction IN ('in', 'out')),
  amount          NUMERIC(18,2),
  balance_before  NUMERIC(18,2),
  balance_after   NUMERIC(18,2),
  promo_code      VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  method          VARCHAR(50),
  promotion_id    INTEGER
);

-- ============================================================================
-- 10. SCHEMA: form_desc
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS form_desc;

CREATE TABLE IF NOT EXISTS form_desc.form_name (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255),
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_desc.inputs (
  id              SERIAL PRIMARY KEY,
  input_name      VARCHAR(255),
  input_type      VARCHAR(100) DEFAULT 'text',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_desc.form_input (
  id              SERIAL PRIMARY KEY,
  form_id         INTEGER NOT NULL REFERENCES form_desc.form_name(id) ON DELETE CASCADE,
  input_id        INTEGER NOT NULL REFERENCES form_desc.inputs(id) ON DELETE CASCADE,
  sort_order      INTEGER DEFAULT 0,
  UNIQUE(form_id, input_id)
);

CREATE INDEX IF NOT EXISTS idx_form_input_form_id ON form_desc.form_input(form_id);
CREATE INDEX IF NOT EXISTS idx_form_input_input_id ON form_desc.form_input(input_id);

INSERT INTO form_desc.inputs (input_name, input_type)
SELECT n, t FROM (VALUES ('User', 'text'), ('Pass', 'password'), ('Email', 'email')) AS v(n, t)
WHERE NOT EXISTS (SELECT 1 FROM form_desc.inputs LIMIT 1);

-- ============================================================================
-- 11. SCHEMA: system_automation
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS system_automation;

CREATE TABLE IF NOT EXISTS system_automation.accounts_admin (
  id              SERIAL PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  password_encrypted TEXT NOT NULL,
  access_token    TEXT,
  token_expires   TIMESTAMPTZ,
  adobe_org_id    TEXT,
  org_name        TEXT,
  org_type        TEXT,
  license_status  TEXT DEFAULT 'unknown',
  license_detail  TEXT,
  user_count      INTEGER DEFAULT 0,
  users_snapshot  TEXT,
  cookie_config   TEXT,
  otp_source      TEXT DEFAULT 'imap',
  last_checked_at TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  mail_backup_id  INTEGER,
  access_url      TEXT
);

CREATE TABLE IF NOT EXISTS system_automation.product_system (
  id              SERIAL PRIMARY KEY,
  variant_id      INTEGER NOT NULL,
  system_code     VARCHAR(64) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (variant_id, system_code)
);

CREATE INDEX IF NOT EXISTS idx_product_system_system_code
  ON system_automation.product_system(system_code);
CREATE INDEX IF NOT EXISTS idx_product_system_variant_id
  ON system_automation.product_system(variant_id);

CREATE TABLE IF NOT EXISTS system_automation.user_account_mapping (
  id              SERIAL PRIMARY KEY,
  user_email      TEXT,
  id_order        VARCHAR(50),
  adobe_account_id INTEGER REFERENCES system_automation.accounts_admin(id),
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  product         VARCHAR(255),
  url_active      TEXT
);

-- ============================================================================
-- 12. SCHEMA: content
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS content;

CREATE TABLE IF NOT EXISTS content.article_categories (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  slug            VARCHAR(120) NOT NULL UNIQUE,
  description     TEXT DEFAULT '',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_categories_slug
  ON content.article_categories(slug);

CREATE TABLE IF NOT EXISTS content.articles (
  id              SERIAL PRIMARY KEY,
  category_id     INTEGER REFERENCES content.article_categories(id) ON DELETE SET NULL,
  title           VARCHAR(500) NOT NULL,
  slug            VARCHAR(500) NOT NULL UNIQUE,
  summary         TEXT DEFAULT '',
  content         TEXT DEFAULT '',
  image_url       TEXT DEFAULT '',
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published')),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON content.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON content.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON content.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON content.articles(published_at DESC NULLS LAST);

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
  ON content.banners(active, sort_order);

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

-- ============================================================================
-- 13. MATERIALIZED VIEWS: product sales summary
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS product.product_sales_summary AS
SELECT
  p.id::VARCHAR(255) AS product_id,
  DATE(o.order_date) AS summary_date,
  COUNT(DISTINCT o.id_order) AS total_orders,
  COUNT(o.id) AS total_quantity,
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0) AS total_revenue,
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0) AS total_cost,
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0) AS total_profit,
  NOW() AS updated_at
FROM orders.order_list o
JOIN product.variant v ON o.id_product = v.variant_name
JOIN product.product p ON v.product_id = p.id
WHERE o.order_date IS NOT NULL
GROUP BY p.id, DATE(o.order_date)
UNION ALL
SELECT
  p.id::VARCHAR(255), DATE(o.order_date),
  COUNT(DISTINCT o.id_order), COUNT(o.id),
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0),
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0),
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0),
  NOW()
FROM orders.order_expired o
JOIN product.variant v ON o.id_product = v.variant_name
JOIN product.product p ON v.product_id = p.id
WHERE o.order_date IS NOT NULL
GROUP BY p.id, DATE(o.order_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sales_summary_unique
  ON product.product_sales_summary(product_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_product_sales_summary_date
  ON product.product_sales_summary(summary_date DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS product.variant_sales_summary AS
SELECT
  v.id::VARCHAR(255) AS variant_id,
  p.id::VARCHAR(255) AS product_id,
  DATE(o.order_date) AS summary_date,
  COUNT(DISTINCT o.id_order) AS total_orders,
  COUNT(o.id) AS total_quantity,
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0) AS total_revenue,
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0) AS total_cost,
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0) AS total_profit,
  NOW() AS updated_at
FROM orders.order_list o
JOIN product.variant v ON o.id_product = v.variant_name
JOIN product.product p ON v.product_id = p.id
WHERE o.order_date IS NOT NULL
GROUP BY v.id, p.id, DATE(o.order_date)
UNION ALL
SELECT
  v.id::VARCHAR(255), p.id::VARCHAR(255), DATE(o.order_date),
  COUNT(DISTINCT o.id_order), COUNT(o.id),
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0),
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0),
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0),
  NOW()
FROM orders.order_expired o
JOIN product.variant v ON o.id_product = v.variant_name
JOIN product.product p ON v.product_id = p.id
WHERE o.order_date IS NOT NULL
GROUP BY v.id, p.id, DATE(o.order_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_variant_sales_summary_unique
  ON product.variant_sales_summary(variant_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_variant_sales_summary_date
  ON product.variant_sales_summary(summary_date DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS product.daily_sales_summary AS
SELECT
  DATE(o.order_date) AS summary_date,
  COUNT(DISTINCT o.id_order) AS total_orders,
  COUNT(o.id) AS total_quantity,
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0) AS total_revenue,
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0) AS total_cost,
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0) AS total_profit,
  NOW() AS updated_at
FROM orders.order_list o
WHERE o.order_date IS NOT NULL
  AND DATE(o.order_date) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(o.order_date)
UNION ALL
SELECT
  DATE(o.order_date),
  COUNT(DISTINCT o.id_order), COUNT(o.id),
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0),
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0),
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0),
  NOW()
FROM orders.order_expired o
WHERE o.order_date IS NOT NULL
  AND DATE(o.order_date) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(o.order_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_sales_summary_date
  ON product.daily_sales_summary(summary_date DESC);

-- Function refresh materialized views
CREATE OR REPLACE FUNCTION product.refresh_sales_summary()
RETURNS TABLE(
  view_name TEXT,
  rows_affected BIGINT,
  refresh_time INTERVAL,
  status TEXT
) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  row_count BIGINT;
BEGIN
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY product.product_sales_summary;
  end_time := clock_timestamp();
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RETURN QUERY SELECT 'product_sales_summary'::TEXT, row_count, end_time - start_time, 'SUCCESS'::TEXT;

  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY product.variant_sales_summary;
  end_time := clock_timestamp();
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RETURN QUERY SELECT 'variant_sales_summary'::TEXT, row_count, end_time - start_time, 'SUCCESS'::TEXT;

  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY product.daily_sales_summary;
  end_time := clock_timestamp();
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RETURN QUERY SELECT 'daily_sales_summary'::TEXT, row_count, end_time - start_time, 'SUCCESS'::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 'ERROR'::TEXT, 0::BIGINT, INTERVAL '0', SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. SCHEMA: key_active — Key kích hoạt ánh xạ tới orders.order_list
--     expires_at luôn đồng bộ với order_list.expired_at (trigger + BEFORE INSERT)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS key_active;

CREATE TABLE IF NOT EXISTS key_active.systems (
  system_code VARCHAR(64) PRIMARY KEY,
  system_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO key_active.systems (system_code, system_name)
VALUES ('DEFAULT', 'Hệ thống mặc định')
ON CONFLICT (system_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS key_active.order_list_keys (
  id BIGSERIAL PRIMARY KEY,
  order_list_id INTEGER NOT NULL,
  id_order VARCHAR(50) NOT NULL,
  key_hash TEXT NOT NULL,
  key_hint VARCHAR(16),
  expires_at DATE,
  system_code VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_list_keys_order_list_id_unique UNIQUE (order_list_id),
  CONSTRAINT order_list_keys_order_list_id_fk
    FOREIGN KEY (order_list_id) REFERENCES orders.order_list (id) ON DELETE CASCADE,
  CONSTRAINT order_list_keys_system_code_fk
    FOREIGN KEY (system_code) REFERENCES key_active.systems (system_code)
      ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_list_keys_id_order_upper
  ON key_active.order_list_keys (UPPER(TRIM(id_order)));

CREATE INDEX IF NOT EXISTS idx_order_list_keys_expires_status
  ON key_active.order_list_keys (expires_at, status)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION key_active.order_list_keys_enforce_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_exp DATE;
  v_code VARCHAR(50);
BEGIN
  SELECT o.expired_at, o.id_order INTO v_exp, v_code
  FROM orders.order_list o
  WHERE o.id = NEW.order_list_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_list_id % không tồn tại trong orders.order_list', NEW.order_list_id;
  END IF;

  NEW.expires_at := v_exp;
  NEW.id_order := COALESCE(NULLIF(TRIM(v_code), ''), NULLIF(TRIM(NEW.id_order), ''));
  IF NEW.id_order IS NULL THEN
    RAISE EXCEPTION 'order_list_id %: id_order trống trên order_list', NEW.order_list_id;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_order_list_keys_bi_enforce ON key_active.order_list_keys;
CREATE TRIGGER tr_order_list_keys_bi_enforce
  BEFORE INSERT OR UPDATE OF order_list_id ON key_active.order_list_keys
  FOR EACH ROW
  EXECUTE PROCEDURE key_active.order_list_keys_enforce_from_order();

CREATE OR REPLACE FUNCTION key_active.sync_order_list_keys_after_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE key_active.order_list_keys k
  SET
    id_order = NEW.id_order,
    expires_at = NEW.expired_at,
    updated_at = NOW()
  WHERE k.order_list_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_order_list_keys_sync_order ON orders.order_list;
CREATE TRIGGER tr_order_list_keys_sync_order
  AFTER UPDATE OF expired_at, id_order ON orders.order_list
  FOR EACH ROW
  EXECUTE PROCEDURE key_active.sync_order_list_keys_after_order_update();

COMMIT;
