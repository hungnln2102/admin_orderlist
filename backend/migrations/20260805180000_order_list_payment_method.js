/**
 * Cột payment_method + usdt_* trên orders.order_list.
 * SQL đồng bộ: database/migrations/110_order_list_payment_method.sql
 */

const SQL_UP = `
-- Phương thức thanh toán đơn hàng: bank (CK ngân hàng) | usdt (ví USDT thủ công).
ALTER TABLE orders.order_list
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'bank';

ALTER TABLE orders.order_list
  ADD COLUMN IF NOT EXISTS usdt_amount_usd numeric(18,4);

ALTER TABLE orders.order_list
  ADD COLUMN IF NOT EXISTS usdt_exchange_rate numeric(18,2);

ALTER TABLE orders.order_list
  ADD COLUMN IF NOT EXISTS usdt_wallet_id integer REFERENCES admin.usdt_wallets(id);

ALTER TABLE orders.order_list
  DROP CONSTRAINT IF EXISTS order_list_payment_method_check;

ALTER TABLE orders.order_list
  ADD CONSTRAINT order_list_payment_method_check
  CHECK (payment_method IN ('bank', 'usdt'));

COMMENT ON COLUMN orders.order_list.payment_method IS
  'bank = CK ngân hàng (Sepay/VietQR); usdt = thanh toán ví USDT thủ công.';
COMMENT ON COLUMN orders.order_list.usdt_amount_usd IS
  'Số tiền USDT (≈ USD) khách cần chuyển, quy đổi từ giá VND theo tỷ giá Binance.';
COMMENT ON COLUMN orders.order_list.usdt_exchange_rate IS
  'Tỷ giá VND/USDT (Binance) tại thời điểm tạo đơn.';
`;

exports.up = async function up(knex) {
  await knex.raw(SQL_UP);
};

exports.down = async function down() {
  // Cột đã dùng trong ứng dụng — không tự gỡ an toàn.
};
