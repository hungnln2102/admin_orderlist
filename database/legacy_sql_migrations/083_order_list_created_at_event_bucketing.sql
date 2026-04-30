-- Mốc thời gian tạo bản ghi để gán doanh thu / đếm đơn theo «thời điểm phát sinh» (thay thế ưu tiên thay vì order_date thuần khi COALESCE với cột tạo).
-- Phần còn lại: COALESCE(created_at::date, order_date đã chuẩn hóa) trong ứng dụng.

ALTER TABLE orders.order_list
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE orders.order_list o
SET created_at = (
  CASE
    WHEN o.order_date IS NULL THEN NULL
    WHEN TRIM(o.order_date::text) = '' THEN NULL
    WHEN TRIM(o.order_date::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      THEN (SUBSTRING(TRIM(o.order_date::text) FROM 1 FOR 10)::date)::timestamptz
    WHEN TRIM(o.order_date::text) ~ '^[0-9]{4}/[0-9]{2}/[0-9]{2}'
      THEN (to_date(SUBSTRING(TRIM(o.order_date::text) FROM 1 FOR 10), 'YYYY/MM/DD'))::timestamptz
    WHEN TRIM(o.order_date::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}'
      THEN (to_date(SUBSTRING(TRIM(o.order_date::text) FROM 1 FOR 10), 'DD/MM/YYYY'))::timestamptz
    WHEN TRIM(o.order_date::text) ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}'
      THEN (to_date(SUBSTRING(TRIM(o.order_date::text) FROM 1 FOR 10), 'DD-MM-YYYY'))::timestamptz
    WHEN TRIM(o.order_date::text) ~ '^[0-9]{8}$'
      THEN (to_date(TRIM(o.order_date::text), 'YYYYMMDD'))::timestamptz
    ELSE NULL
  END
)
WHERE o.created_at IS NULL;

UPDATE orders.order_list
SET created_at = NOW()
WHERE created_at IS NULL;

ALTER TABLE orders.order_list
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW();
