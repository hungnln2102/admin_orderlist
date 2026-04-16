/**
 * Log chi phí NCC: mặc định «Chưa Thanh Toán»; reset dòng cũ; trigger không gán «Đã Thanh Toán» theo trạng thái đơn.
 * @see database/migrations/058_supplier_order_cost_log_default_unpaid.sql
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
    "058_supplier_order_cost_log_default_unpaid.sql"
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
    "057_supplier_order_cost_log_webhook_paid_flow.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};
