/**
 * @see database/migrations/059_supplier_payments_drop_payment_state.sql
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
    "059_supplier_payments_drop_payment_state.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    ALTER TABLE partner.supplier_payments
      ADD COLUMN IF NOT EXISTS payment_state TEXT DEFAULT 'Chưa Thanh Toán';
    CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_state
      ON partner.supplier_payments(supplier_id, payment_state);
  `);
};
