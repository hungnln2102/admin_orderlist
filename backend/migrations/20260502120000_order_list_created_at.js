/**
 * Cột created_at: mốc tạo bản ghi — phục vụ gán theo thời điểm phát sinh thay vì tháng order_date.
 * @see database/migrations/083_order_list_created_at_event_bucketing.sql
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
    "083_order_list_created_at_event_bucketing.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down() {
  // Cột đã dùng trong dashboard — không tự xóa an toàn.
};
