/**
 * 20261119000003_create_activation_key_rules.js
 *
 * Migration tạo bảng warehouse.activation_key_rules phục vụ:
 * 1. Cấu hình quy tắc tự động cấp Activation Key theo cặp Variant + Supplier.
 * 2. Xác định Kho Slot đích (warehouse.product_names) để bốc tài khoản khi khách kích hoạt trên Web.
 * 3. Hỗ trợ bật/tắt (is_active) từng quy tắc linh hoạt.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const WAREHOUSE_SCHEMA = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
  const BUSINESS_SCHEMA = process.env.DB_SCHEMA_PRODUCT || process.env.DB_SCHEMA_BUSINESS || "business";
  const PARTNER_SCHEMA = process.env.DB_SCHEMA_PARTNER || process.env.SCHEMA_PARTNER || "business";

  const tableExists = await knex.schema.withSchema(WAREHOUSE_SCHEMA).hasTable("activation_key_rules");
  if (!tableExists) {
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS ${WAREHOUSE_SCHEMA}.activation_key_rules (
        id BIGSERIAL PRIMARY KEY,
        variant_id BIGINT NOT NULL REFERENCES ${BUSINESS_SCHEMA}.variant(id) ON DELETE CASCADE,
        supplier_id BIGINT NOT NULL REFERENCES ${PARTNER_SCHEMA}.supplier(id) ON DELETE CASCADE,
        product_name_id BIGINT NOT NULL REFERENCES ${WAREHOUSE_SCHEMA}.product_names(id) ON DELETE RESTRICT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_activation_key_rules_variant_supplier UNIQUE (variant_id, supplier_id)
      );

      CREATE INDEX IF NOT EXISTS idx_activation_key_rules_variant ON ${WAREHOUSE_SCHEMA}.activation_key_rules (variant_id);
      CREATE INDEX IF NOT EXISTS idx_activation_key_rules_supplier ON ${WAREHOUSE_SCHEMA}.activation_key_rules (supplier_id);
      CREATE INDEX IF NOT EXISTS idx_activation_key_rules_active ON ${WAREHOUSE_SCHEMA}.activation_key_rules (is_active);
    `);
  }
};

exports.down = async function (knex) {
  const WAREHOUSE_SCHEMA = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
  await knex.raw(`DROP TABLE IF EXISTS ${WAREHOUSE_SCHEMA}.activation_key_rules CASCADE;`);
};
