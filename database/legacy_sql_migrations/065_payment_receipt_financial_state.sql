-- Bảng cờ tài chính cho mỗi biên lai webhook (1-1 với orders.payment_receipt).
CREATE TABLE IF NOT EXISTS orders.payment_receipt_financial_state (
  id BIGSERIAL PRIMARY KEY,
  payment_receipt_id BIGINT NOT NULL UNIQUE
    REFERENCES orders.payment_receipt(id) ON DELETE CASCADE,
  is_financial_posted BOOLEAN NOT NULL DEFAULT FALSE,
  posted_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  posted_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  reconciled_at TIMESTAMPTZ NULL,
  adjustment_applied BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_receipt_fin_state_posted
  ON orders.payment_receipt_financial_state (is_financial_posted);

-- Backfill cho dữ liệu biên lai cũ để đảm bảo mỗi receipt đều có state row.
INSERT INTO orders.payment_receipt_financial_state (payment_receipt_id)
SELECT pr.id
FROM orders.payment_receipt pr
LEFT JOIN orders.payment_receipt_financial_state fs
  ON fs.payment_receipt_id = pr.id
WHERE fs.payment_receipt_id IS NULL;
