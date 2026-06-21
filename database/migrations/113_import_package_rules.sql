-- Migration 113: Tao bang import_package_rules
-- Luu cau hinh "san pham nao can tao goi khi nhap hang"
-- Moi san pham co the cau hinh danh sach fields can hien thi

CREATE TABLE IF NOT EXISTS product.import_package_rules (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE REFERENCES product.product(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  -- Danh sach fields can hien thi: ["account","password","backup_email","two_fa","expires_at","note"]
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_slot_limit INTEGER NOT NULL DEFAULT 1,
  -- match mode mac dinh khi tao goi: information_order | slot
  default_match_mode VARCHAR(30) NOT NULL DEFAULT 'information_order',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_package_rules_product_id
  ON product.import_package_rules (product_id);

COMMENT ON TABLE product.import_package_rules IS
  'Cau hinh nhap hang + tao goi tu dong theo san pham. enabled=true -> form nhap hang hien block tao goi.';

COMMENT ON COLUMN product.import_package_rules.fields IS
  'Danh sach fields hien thi trong block tao goi: account, password, backup_email, two_fa, expires_at, note';
