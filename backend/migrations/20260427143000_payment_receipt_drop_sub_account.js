/**
 * @see database/migrations/064_payment_receipt_drop_sub_account.sql
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
    "064_payment_receipt_drop_sub_account.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    ALTER TABLE orders.payment_receipt
      ADD COLUMN IF NOT EXISTS sub_account VARCHAR(255);
  `);
};
