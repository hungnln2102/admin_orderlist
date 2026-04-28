/**
 * Finance rule: manual payment only moves to PROCESSING; webhook posts revenue
 * and moves the order to PAID. Also drops the old receipt insert revenue trigger.
 * @see database/migrations/086_webhook_finance_processing_paid_flow.sql
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
    "086_webhook_finance_processing_paid_flow.sql"
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
    "080_supplier_order_cost_log_ncc_refund_on_cancel.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};
