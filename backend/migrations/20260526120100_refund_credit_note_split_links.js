/**
 * split_from_note_id, succeeded_by_note_id trên refund_credit_notes + cập nhật fn_recompute.
 * Sửa lỗi list orders: "column c_applied.succeeded_by_note_id does not exist" khi thiếu migration.
 * @see database/migrations/085_refund_credit_note_split_links.sql
 */

const fs = require("fs");
const path = require("path");

const readSql = (filename) =>
  fs.readFileSync(
    path.join(__dirname, "..", "..", "database", "migrations", filename),
    "utf8"
  );

exports.up = async function up(knex) {
  await knex.raw(readSql("080_create_refund_credit_notes.sql"));
  await knex.raw(readSql("081_create_refund_credit_applications.sql"));
  await knex.raw(readSql("085_refund_credit_note_split_links.sql"));
};

exports.down = async function down() {
  // Có cột khóa ngoại + thay function — rollback thủ công nếu cần.
};
