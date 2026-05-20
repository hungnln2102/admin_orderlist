/**
 * Cột transaction trên orders.order_list — mã nội dung CK / webhook.
 * SQL đồng bộ: database/migrations/102_order_list_transaction.sql
 */

const SQL_UP = `
-- Mã tham chiếu thanh toán (nội dung CK / webhook), tách khỏi id_order (MAV…).
ALTER TABLE orders.order_list
  ADD COLUMN IF NOT EXISTS transaction text;

COMMENT ON COLUMN orders.order_list.transaction IS
  'Mã CK ngắn (chữ+số), unique; webhook khớp theo cột này, biên lai note vẫn ghi id_order.';

CREATE UNIQUE INDEX IF NOT EXISTS order_list_transaction_upper_unique_idx
  ON orders.order_list (UPPER(TRIM(transaction)))
  WHERE transaction IS NOT NULL AND TRIM(transaction) <> '';
`;

exports.up = async function up(knex) {
  await knex.raw(SQL_UP);
};

exports.down = async function down() {
  // Cột đã dùng trong ứng dụng — không tự gỡ an toàn.
};
