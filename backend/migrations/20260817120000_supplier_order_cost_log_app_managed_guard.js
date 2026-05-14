/**
 * Thêm GUC guard `app.supplier_change_managed` vào trigger fn_supplier_order_cost_log_on_success.
 * Service domains/supplier-change SET LOCAL flag này để tự quản lý log khi đổi NCC
 * (Flow A ≤5 ngày / Flow B Chưa TT / Flow B Đã TT).
 *
 * @see database/migrations/101_supplier_order_cost_log_app_managed_guard.sql
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
    "101_supplier_order_cost_log_app_managed_guard.sql"
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
    "091_supplier_order_cost_log_fn_canonical.sql"
  );
  await knex.raw(fs.readFileSync(sqlPath, "utf8"));
};
