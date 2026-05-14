-- Chuẩn hóa orders.payment_receipt.payment_date về kiểu DATE.
-- Dữ liệu cũ dạng text được convert an toàn theo các pattern thường gặp.

ALTER TABLE orders.payment_receipt
  ALTER COLUMN payment_date TYPE DATE
  USING (
    CASE
      WHEN payment_date IS NULL OR BTRIM(payment_date) = '' THEN NULL
      WHEN BTRIM(payment_date) ~ '^\d{4}-\d{2}-\d{2}$'
        THEN BTRIM(payment_date)::date
      WHEN BTRIM(payment_date) ~ '^\d{4}/\d{2}/\d{2}$'
        THEN to_date(BTRIM(payment_date), 'YYYY/MM/DD')
      WHEN BTRIM(payment_date) ~ '^\d{2}/\d{2}/\d{4}$'
        THEN to_date(BTRIM(payment_date), 'DD/MM/YYYY')
      WHEN BTRIM(payment_date) ~ '^\d{4}-\d{2}-\d{2}\s+'
        THEN split_part(BTRIM(payment_date), ' ', 1)::date
      ELSE NULL
    END
  );
