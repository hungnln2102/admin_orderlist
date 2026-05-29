/**
 * Bảng admin.usdt_wallets + admin.usdt_wallet_ledger.
 * SQL đồng bộ: database/migrations/109_usdt_wallets.sql
 */

const fs = require("fs");
const path = require("path");

const SQL_UP = fs.readFileSync(
  path.join(__dirname, "../../database/migrations/109_usdt_wallets.sql"),
  "utf8"
);

exports.up = async function up(knex) {
  await knex.raw(SQL_UP);
};

exports.down = async function down() {
  // Bảng đã dùng trong ứng dụng — không tự gỡ an toàn.
};
