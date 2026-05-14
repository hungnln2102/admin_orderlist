/**
 * MAVN: giữ supplier_order_cost_log.logged_at = mốc lúc chuyển Đã TT (DEFAULT NOW khi INSERT),
 * không ghi đè khi chỉnh cost/NCC sau — để trừ lợi nhuận đúng tháng đó.
 * @see database/migrations/087_mavn_preserve_logged_at_on_cost_update.sql
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
    "087_mavn_preserve_logged_at_on_cost_update.sql"
  );
  await knex.raw(fs.readFileSync(sqlPath, "utf8"));
};

exports.down = async function down(knex) {
  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "migrations",
    "086_webhook_finance_processing_paid_flow.sql"
  );
  await knex.raw(fs.readFileSync(sqlPath, "utf8"));
};
