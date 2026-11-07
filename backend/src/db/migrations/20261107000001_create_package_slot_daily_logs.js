/**
 * Migration: Tạo bảng warehouse.package_slot_daily_logs để theo dõi và ghi nhận
 * chi phí phân bổ slot trống hàng ngày của các gói nhập hàng trong Kho Gói Sản Phẩm.
 * Đồng thời bổ sung cột slot_vacant_cost vào finance.daily_revenue_summary.
 */
const WAREHOUSE_SCHEMA = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
const ORDERS_SCHEMA = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "business";
const DASHBOARD_SCHEMA = process.env.DB_SCHEMA_DASHBOARD || "finance";

exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${WAREHOUSE_SCHEMA}.package_slot_daily_logs (
      id BIGSERIAL PRIMARY KEY,
      log_date DATE NOT NULL,
      package_product_id BIGINT NOT NULL REFERENCES ${WAREHOUSE_SCHEMA}.package_products(id) ON DELETE CASCADE,
      import_order_id BIGINT REFERENCES ${ORDERS_SCHEMA}.order_list(id) ON DELETE SET NULL,
      import_order_code VARCHAR(100),
      account_username VARCHAR(255),
      total_slots INT NOT NULL DEFAULT 1,
      occupied_slots INT NOT NULL DEFAULT 0,
      vacant_slots INT NOT NULL DEFAULT 0,
      cost_per_slot_day NUMERIC(15, 2) NOT NULL DEFAULT 0,
      vacant_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
      note TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_pkg_slot_daily_log_date_pkg_order UNIQUE (log_date, package_product_id, import_order_id)
    );

    CREATE INDEX IF NOT EXISTS idx_pkg_slot_daily_logs_date 
      ON ${WAREHOUSE_SCHEMA}.package_slot_daily_logs(log_date);
    CREATE INDEX IF NOT EXISTS idx_pkg_slot_daily_logs_pkg 
      ON ${WAREHOUSE_SCHEMA}.package_slot_daily_logs(package_product_id);
    CREATE INDEX IF NOT EXISTS idx_pkg_slot_daily_logs_order 
      ON ${WAREHOUSE_SCHEMA}.package_slot_daily_logs(import_order_id);

    ALTER TABLE ${DASHBOARD_SCHEMA}.daily_revenue_summary
      ADD COLUMN IF NOT EXISTS slot_vacant_cost NUMERIC(15, 2) DEFAULT 0;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS ${WAREHOUSE_SCHEMA}.package_slot_daily_logs CASCADE;

    ALTER TABLE ${DASHBOARD_SCHEMA}.daily_revenue_summary
      DROP COLUMN IF EXISTS slot_vacant_cost;
  `);
};

