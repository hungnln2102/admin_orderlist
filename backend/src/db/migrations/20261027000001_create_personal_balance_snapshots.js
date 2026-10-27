/**
 * Migration: Tạo bảng lưu vết lịch sử số dư tài chính cá nhân định kỳ (Personal Balance Snapshots)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const schemaFinance = process.env.DB_SCHEMA_FINANCE || "finance";

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaFinance}.personal_balance_snapshots (
      id BIGSERIAL PRIMARY KEY,
      snapshot_date DATE UNIQUE NOT NULL,
      total_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      previous_balance NUMERIC(15, 2) DEFAULT 0,
      delta_amount NUMERIC(15, 2) DEFAULT 0,
      delta_percent NUMERIC(6, 2) DEFAULT 0,
      balances_detail JSONB NOT NULL DEFAULT '[]',
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_personal_snapshots_date 
      ON ${schemaFinance}.personal_balance_snapshots(snapshot_date DESC);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const schemaFinance = process.env.DB_SCHEMA_FINANCE || "finance";
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_balance_snapshots CASCADE;`);
};
