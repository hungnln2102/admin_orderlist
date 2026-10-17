/**
 * Migration 20261017000001: Add account_scope to finance.financial_accounts
 * Phân biệt tài khoản ngân hàng / ví giữa 'SHOP' (kinh doanh) và 'PERSONAL' (cá nhân / thanh khoản).
 */

const schemaFinance = process.env.DB_SCHEMA_FINANCE || process.env.SCHEMA_FINANCE || "finance";

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaFinance}.financial_accounts
      ADD COLUMN IF NOT EXISTS account_scope VARCHAR(20) NOT NULL DEFAULT 'SHOP';
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_financial_accounts_scope ON ${schemaFinance}.financial_accounts(account_scope);
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaFinance}.financial_accounts DROP COLUMN IF EXISTS account_scope;
  `);
};
