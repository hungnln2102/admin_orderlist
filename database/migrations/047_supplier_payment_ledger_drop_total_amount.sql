-- Ghi nhận mỗi phát sinh (Sepay / thủ công / carryover) vào partner.supplier_payment_ledger.
-- Bỏ total_amount trên supplier_payments; giữ id cũ khi migrate để API confirm vẫn khớp.

CREATE TABLE IF NOT EXISTS partner.supplier_payment_ledger (
  id              BIGSERIAL PRIMARY KEY,
  supplier_id     INTEGER NOT NULL REFERENCES partner.supplier(id),
  amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(18,2) NOT NULL DEFAULT 0,
  payment_period  TEXT,
  payment_status  TEXT,
  note            TEXT,
  source          TEXT NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payment_ledger_supplier_created
  ON partner.supplier_payment_ledger (supplier_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'partner'
      AND table_name = 'supplier_payments'
      AND column_name = 'total_amount'
  ) THEN
    INSERT INTO partner.supplier_payment_ledger (
      id,
      supplier_id,
      amount,
      amount_paid,
      payment_period,
      payment_status,
      note,
      source,
      created_at
    )
    SELECT
      id,
      supplier_id,
      COALESCE(total_amount, 0),
      COALESCE(amount_paid, 0),
      payment_period,
      payment_status,
      NULL,
      'legacy',
      NOW()
    FROM partner.supplier_payments sp
    WHERE EXISTS (SELECT 1 FROM partner.supplier s WHERE s.id = sp.supplier_id)
    ON CONFLICT (id) DO NOTHING;

    PERFORM setval(
      pg_get_serial_sequence('partner.supplier_payment_ledger', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 1) FROM partner.supplier_payment_ledger), 1)
    );
  END IF;
END $$;

ALTER TABLE partner.supplier_payments DROP COLUMN IF EXISTS total_amount;
