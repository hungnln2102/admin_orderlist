/**
 * Cột transaction trên orders.order_list — mã nội dung CK / webhook.
 * @see database/migrations/102_order_list_transaction.sql
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
    "102_order_list_transaction.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down() {
  // Cột đã dùng trong ứng dụng — không tự gỡ an toàn.
};
