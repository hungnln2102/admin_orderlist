/**
 * Bảng admin.shop_bank_accounts — quản lý STK nhận CK.
 * @see database/migrations/103_shop_bank_accounts.sql
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
    "103_shop_bank_accounts.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down() {
  // Bảng đã dùng trong ứng dụng — không tự gỡ an toàn.
};
