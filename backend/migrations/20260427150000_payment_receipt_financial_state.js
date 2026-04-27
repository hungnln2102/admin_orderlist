/**
 * @see database/migrations/065_payment_receipt_financial_state.sql
 */

const fs = require("fs");
const path = require("path");

exports.up = async function up(knex) {
  const hasLegacyTable = await knex.schema.withSchema("orders").hasTable("payment_receipt");
  if (!hasLegacyTable) return;

  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "migrations",
    "065_payment_receipt_financial_state.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS orders.idx_payment_receipt_fin_state_posted;
    DROP TABLE IF EXISTS orders.payment_receipt_financial_state;
  `);
};
