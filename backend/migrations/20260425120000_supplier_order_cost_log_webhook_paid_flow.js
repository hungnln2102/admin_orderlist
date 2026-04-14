/**
 * @see database/migrations/057_supplier_order_cost_log_webhook_paid_flow.sql
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
    "057_supplier_order_cost_log_webhook_paid_flow.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "migrations",
    "054_supplier_order_cost_log_insert_each_processing_entry.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};
