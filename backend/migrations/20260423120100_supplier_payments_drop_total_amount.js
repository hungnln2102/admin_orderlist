const fs = require("fs");
const path = require("path");

/** Chạy sau 055: xóa total_amount nếu DB cũ đã chạy bản 048 thêm lại cột. */
exports.up = async function up(knex) {
  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "migrations",
    "056_supplier_payments_drop_total_amount.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down() {
  // Không tạo lại cột (dữ liệu cũ không khôi phục được).
};
