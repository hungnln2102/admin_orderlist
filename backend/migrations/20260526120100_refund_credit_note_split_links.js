/**
 * split_from_note_id, succeeded_by_note_id trên refund_credit_notes + cập nhật fn_recompute.
 * Sửa lỗi list orders: "column c_applied.succeeded_by_note_id does not exist" khi thiếu migration.
 * @see database/migrations/085_refund_credit_note_split_links.sql
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
    "085_refund_credit_note_split_links.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down() {
  // Có cột khóa ngoại + thay function — rollback thủ công nếu cần.
};
