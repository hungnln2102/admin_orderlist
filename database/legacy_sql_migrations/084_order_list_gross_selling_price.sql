BEGIN;

-- Giá bán (gross) trước khi trừ credit; dùng khi cần hiển thị giá gốc / QR logic trong khi price là số còn thu.
ALTER TABLE orders.order_list
  ADD COLUMN IF NOT EXISTS gross_selling_price NUMERIC(18, 2) NULL
  CHECK (gross_selling_price IS NULL OR gross_selling_price >= 0);

COMMENT ON COLUMN orders.order_list.gross_selling_price IS
  'Giá bán trước trừ refund credit; null = không dùng credit tại tạo đơn hoặc bản ghi cũ.';

COMMIT;
