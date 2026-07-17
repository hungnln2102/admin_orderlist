/**
 * Link supplier payment cycles to the shop bank account used for settlement.
 * SQL: database/migrations/106_supplier_payments_shop_bank_account.sql
 */
const { loadBackendEnv } = require("@/config/loadEnv");

loadBackendEnv();

const pickSchema = (...c) => c.find(Boolean);

const partnerSchema = pickSchema(
  process.env.DB_SCHEMA_PARTNER,
  process.env.SCHEMA_PARTNER,
  "partner"
);

const ident = (name) => {
  const s = String(name || "").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return s;
};

exports.up = async (knex) => {
  const partner = ident(partnerSchema);
  await knex.raw(`
ALTER TABLE "${partner}".supplier_payments
  ADD COLUMN IF NOT EXISTS shop_bank_account_id integer;

ALTER TABLE "${partner}".supplier_payments
  DROP CONSTRAINT IF EXISTS supplier_payments_shop_bank_account_fkey;

ALTER TABLE "${partner}".supplier_payments
  ADD CONSTRAINT supplier_payments_shop_bank_account_fkey
  FOREIGN KEY (shop_bank_account_id) REFERENCES admin.shop_bank_accounts(id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_shop_bank_account_id
  ON "${partner}".supplier_payments (shop_bank_account_id);
`);
};

exports.down = async (knex) => {
  const partner = ident(partnerSchema);
  await knex.raw(`
DROP INDEX IF EXISTS "${partner}".idx_supplier_payments_shop_bank_account_id;

ALTER TABLE "${partner}".supplier_payments
  DROP CONSTRAINT IF EXISTS supplier_payments_shop_bank_account_fkey;

ALTER TABLE "${partner}".supplier_payments
  DROP COLUMN IF EXISTS shop_bank_account_id;
`);
};
