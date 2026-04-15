/**
 * @see database/migrations/063_payment_receipt_sepay_dedupe.sql
 */

const fs = require("fs");
const path = require("path");

exports.up = async function up(knex) {
  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "migrations",
    "063_payment_receipt_sepay_dedupe.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS orders.uq_payment_receipt_sepay_transaction_id;
    DROP INDEX IF EXISTS orders.idx_payment_receipt_reference_fallback;
    ALTER TABLE orders.payment_receipt
      DROP COLUMN IF EXISTS sepay_transaction_id,
      DROP COLUMN IF EXISTS reference_code,
      DROP COLUMN IF EXISTS transfer_type,
      DROP COLUMN IF EXISTS gateway,
      DROP COLUMN IF EXISTS sub_account;
  `);
};
