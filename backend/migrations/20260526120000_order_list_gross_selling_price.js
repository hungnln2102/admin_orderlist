/**
 * Cột gross_selling_price (giá bán trước trừ credit) — cần cho list orders / QR.
 * @see database/migrations/084_order_list_gross_selling_price.sql
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
    "084_order_list_gross_selling_price.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down() {
  // Cột đã dùng trong ứng dụng — không tự gỡ an toàn.
};
