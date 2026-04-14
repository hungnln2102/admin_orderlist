/**
 * Gộp toàn bộ chuỗi supplier_order_cost_log (039→054) + supplier_payments/ledger (045→048)
 * và phần cuối tương đương 056–057 (DROP total_amount + luồng webhook/thanh toán).
 * @see database/migrations/055_supplier_order_cost_log_consolidated.sql
 *
 * Nếu DB đã chạy các migration 20260414*…20260422* riêng lẻ: xóa các dòng tương ứng trong
 * knex_migrations (hoặc chỉ chạy file SQL 055 tay) rồi chạy migration này một lần.
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
    "055_supplier_order_cost_log_consolidated.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_order_success ON orders.order_list;
    DROP FUNCTION IF EXISTS partner.fn_supplier_order_cost_log_on_success();
    DROP TABLE IF EXISTS partner.supplier_order_cost_log;
    DROP FUNCTION IF EXISTS orders.fn_supplier_order_cost_log_on_success();
    DROP TABLE IF EXISTS orders.supplier_order_cost_log;
  `);
};
