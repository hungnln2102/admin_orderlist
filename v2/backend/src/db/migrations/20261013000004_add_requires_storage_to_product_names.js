/**
 * Migration 20261013000004: Add requires_storage column to warehouse.product_names
 * Cho phép cấu hình sản phẩm / loại gói có sử dụng tài khoản dung lượng liên kết (Storage Account).
 */

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE warehouse.product_names
    ADD COLUMN IF NOT EXISTS requires_storage BOOLEAN DEFAULT false;
  `);

  // Đặt mặc định requires_storage = true cho các loại gói lưu trữ / thiết kế quen thuộc
  await knex.raw(`
    UPDATE warehouse.product_names
    SET requires_storage = true
    WHERE LOWER(name) IN ('canva', 'googleone', 'google one', 'adobe');
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE warehouse.product_names
    DROP COLUMN IF EXISTS requires_storage;
  `);
};
