/**
 * Trigger log NCC: khi hủy/chuyển Chưa Hoàn, ghi refund_amount = prorata giá vốn theo ngày
 * (cùng cách calcRemainingImport), không còn để 0.
 * @see database/migrations/080_supplier_order_cost_log_ncc_refund_on_cancel.sql
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
    "080_supplier_order_cost_log_ncc_refund_on_cancel.sql"
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
    "079_pending_refund_label_chua_hoan.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};
