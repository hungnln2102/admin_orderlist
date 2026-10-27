/**
 * Migration: Thêm 2 cột personal_balance và shop_balance vào bảng personal_balance_snapshots
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const schemaFinance = process.env.DB_SCHEMA_FINANCE || "finance";

  await knex.raw(`
    ALTER TABLE ${schemaFinance}.personal_balance_snapshots
      ADD COLUMN IF NOT EXISTS personal_balance NUMERIC(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS shop_balance NUMERIC(15, 2) DEFAULT 0;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const schemaFinance = process.env.DB_SCHEMA_FINANCE || "finance";

  await knex.raw(`
    ALTER TABLE ${schemaFinance}.personal_balance_snapshots
      DROP COLUMN IF EXISTS personal_balance,
      DROP COLUMN IF EXISTS shop_balance;
  `);
};
