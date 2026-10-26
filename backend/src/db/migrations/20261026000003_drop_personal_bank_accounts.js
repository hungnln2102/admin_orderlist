/**
 * Migration: Xóa bảng tàn dư finance.personal_bank_accounts
 * Bảng này được thay thế hoàn toàn bởi finance.financial_accounts (DB-OPT-01).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const schemaFinance = process.env.DB_SCHEMA_FINANCE || "finance";
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_bank_accounts CASCADE;`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const schemaFinance = process.env.DB_SCHEMA_FINANCE || "finance";
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaFinance}.personal_bank_accounts (
      id BIGSERIAL PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      account_number VARCHAR(50) NOT NULL,
      account_holder VARCHAR(100),
      bank_display_name VARCHAR(100),
      bank_short_code VARCHAR(50),
      balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
};
