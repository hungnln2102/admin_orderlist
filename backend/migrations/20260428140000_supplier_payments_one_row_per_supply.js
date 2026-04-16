/**
 * Một chu kỳ thanh toán NCC / supplier (gộp dòng cũ + unique supplier_id).
 * @see database/migrations/060_supplier_payments_one_row_per_supply.sql
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
    "060_supplier_payments_one_row_per_supply.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(
    "DROP INDEX IF EXISTS partner.uq_supplier_payments_supplier_id;"
  );
};
