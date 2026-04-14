/**
 * @see database/migrations/058_supplier_payments_status_to_content.sql
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
    "058_supplier_payments_status_to_content.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS partner.idx_supplier_payments_supplier_state;
    ALTER TABLE partner.supplier_payments
      DROP COLUMN IF EXISTS payment_state;
  `);
};
