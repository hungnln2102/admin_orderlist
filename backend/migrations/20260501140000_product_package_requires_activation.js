/**
 * product.package_requires_activation — phân biệt loại gói có trường kích hoạt hay không.
 * @see database/migrations/092_product_package_requires_activation.sql
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
    "092_product_package_requires_activation.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down() {
  // Không gỡ cột đã dùng trong ứng dụng.
};
