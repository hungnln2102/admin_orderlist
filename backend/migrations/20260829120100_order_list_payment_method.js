/**
 * Cột payment_method + usdt_* trên orders.order_list.
 * SQL đồng bộ: database/migrations/110_order_list_payment_method.sql
 */

const fs = require("fs");
const path = require("path");

const SQL_UP = fs.readFileSync(
  path.join(__dirname, "../../database/migrations/110_order_list_payment_method.sql"),
  "utf8"
);

exports.up = async function up(knex) {
  await knex.raw(SQL_UP);
};

exports.down = async function down() {
  // Cột đã dùng trong ứng dụng — không tự gỡ an toàn.
};
