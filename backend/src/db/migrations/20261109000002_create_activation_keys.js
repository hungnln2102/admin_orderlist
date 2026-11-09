/**
 * 20261109000002_create_activation_keys.js
 *
 * Migration tạo bảng warehouse.activation_keys phục vụ:
 * 1. Tự sinh mã kích hoạt (activation key) khi bán đơn hàng dịch vụ dùng chung (GPT, v.v.).
 * 2. Cổng web khách nhập key tự động chiếm slot trong Kho Gói Sản Phẩm (warehouse.account_slots).
 * 3. Tự động lưu tài khoản vào cột orders.order_list.slot của khách hàng.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const WAREHOUSE_SCHEMA = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
  const BUSINESS_SCHEMA = process.env.DB_SCHEMA_PRODUCT || process.env.DB_SCHEMA_BUSINESS || "business";

  const tableExists = await knex.schema.withSchema(WAREHOUSE_SCHEMA).hasTable("activation_keys");
  if (!tableExists) {
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS ${WAREHOUSE_SCHEMA}.activation_keys (
        id BIGSERIAL PRIMARY KEY,
        key_code VARCHAR(100) NOT NULL,
        product_name_id BIGINT REFERENCES ${WAREHOUSE_SCHEMA}.product_names(id) ON DELETE SET NULL,
        product_id BIGINT REFERENCES ${BUSINESS_SCHEMA}.product(id) ON DELETE SET NULL,
        package_product_id BIGINT REFERENCES ${WAREHOUSE_SCHEMA}.package_products(id) ON DELETE SET NULL,
        id_order VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
        account_slot_id BIGINT REFERENCES ${WAREHOUSE_SCHEMA}.account_slots(id) ON DELETE SET NULL,
        assigned_account VARCHAR(255),
        customer_info VARCHAR(255),
        activated_at TIMESTAMPTZ,
        expired_at TIMESTAMPTZ,
        note TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_warehouse_activation_keys_code UNIQUE (key_code)
      );

      CREATE INDEX IF NOT EXISTS idx_warehouse_activation_keys_key_code ON ${WAREHOUSE_SCHEMA}.activation_keys (key_code);
      CREATE INDEX IF NOT EXISTS idx_warehouse_activation_keys_status ON ${WAREHOUSE_SCHEMA}.activation_keys (status);
      CREATE INDEX IF NOT EXISTS idx_warehouse_activation_keys_pname ON ${WAREHOUSE_SCHEMA}.activation_keys (product_name_id);
      CREATE INDEX IF NOT EXISTS idx_warehouse_activation_keys_order ON ${WAREHOUSE_SCHEMA}.activation_keys (id_order);
    `);
  }
};

exports.down = async function (knex) {
  const WAREHOUSE_SCHEMA = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
  await knex.raw(`DROP TABLE IF EXISTS ${WAREHOUSE_SCHEMA}.activation_keys CASCADE;`);
};

