CREATE TABLE IF NOT EXISTS receipt.payment_receipt_batch (
  id BIGSERIAL PRIMARY KEY,
  batch_code TEXT NOT NULL UNIQUE,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'invoices',
  note TEXT NULL,
  paid_receipt_id BIGINT NULL REFERENCES receipt.payment_receipt(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipt.payment_receipt_batch_item (
  id BIGSERIAL PRIMARY KEY,
  batch_id BIGINT NOT NULL REFERENCES receipt.payment_receipt_batch(id) ON DELETE CASCADE,
  batch_code TEXT NOT NULL,
  order_code TEXT NOT NULL,
  order_list_id BIGINT NULL,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batch_id, order_code)
);

CREATE INDEX IF NOT EXISTS idx_receipt_batch_code
  ON receipt.payment_receipt_batch(batch_code);

CREATE INDEX IF NOT EXISTS idx_receipt_batch_status
  ON receipt.payment_receipt_batch(status);

CREATE INDEX IF NOT EXISTS idx_receipt_batch_item_batch_code
  ON receipt.payment_receipt_batch_item(batch_code);

CREATE INDEX IF NOT EXISTS idx_receipt_batch_item_order_code
  ON receipt.payment_receipt_batch_item(order_code);

CREATE OR REPLACE FUNCTION receipt.fn_touch_payment_receipt_batch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_touch_payment_receipt_batch_updated_at
  ON receipt.payment_receipt_batch;

CREATE TRIGGER tr_touch_payment_receipt_batch_updated_at
  BEFORE UPDATE ON receipt.payment_receipt_batch
  FOR EACH ROW
  EXECUTE PROCEDURE receipt.fn_touch_payment_receipt_batch_updated_at();
