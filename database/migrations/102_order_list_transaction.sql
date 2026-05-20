-- Mã tham chiếu thanh toán (nội dung CK / webhook), tách khỏi id_order (MAV…).
ALTER TABLE orders.order_list
  ADD COLUMN IF NOT EXISTS transaction text;

COMMENT ON COLUMN orders.order_list.transaction IS
  'Mã CK ngắn (chữ+số), unique; webhook khớp theo cột này, biên lai note vẫn ghi id_order.';

CREATE UNIQUE INDEX IF NOT EXISTS order_list_transaction_upper_unique_idx
  ON orders.order_list (UPPER(TRIM(transaction)))
  WHERE transaction IS NOT NULL AND TRIM(transaction) <> '';
