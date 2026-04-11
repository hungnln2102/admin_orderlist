/**
 * Baseline migration — đánh dấu schema hiện tại đã tồn tại.
 * Full schema nằm ở database/migrations/000_full_schema.sql.
 * Migration này chỉ tạo marker, không alter DB.
 */

exports.up = async function (knex) {
  const hasOrderSchema = await knex.raw(
    "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'orders'"
  );
  if (!hasOrderSchema.rows.length) {
    throw new Error(
      "Schema 'orders' chưa tồn tại. Chạy database/migrations/000_full_schema.sql trước."
    );
  }
};

exports.down = async function () {
  // Baseline — không rollback
};
