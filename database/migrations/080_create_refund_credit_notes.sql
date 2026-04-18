BEGIN;

CREATE SCHEMA IF NOT EXISTS receipt;

CREATE TABLE IF NOT EXISTS receipt.refund_credit_notes (
  id BIGSERIAL PRIMARY KEY,
  credit_code VARCHAR(80) NOT NULL UNIQUE,
  source_order_list_id INTEGER NULL REFERENCES orders.order_list(id) ON DELETE SET NULL,
  source_order_code VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255) NULL,
  customer_contact VARCHAR(255) NULL,
  refund_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  available_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (available_amount >= 0),
  status VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  note TEXT NULL,
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT refund_credit_notes_status_ck
    CHECK (status IN ('OPEN', 'PARTIALLY_APPLIED', 'FULLY_APPLIED', 'VOID')),
  CONSTRAINT refund_credit_notes_available_lte_refund_ck
    CHECK (available_amount <= refund_amount)
);

CREATE INDEX IF NOT EXISTS idx_refund_credit_notes_source_order_code
  ON receipt.refund_credit_notes (UPPER(TRIM(source_order_code)));

CREATE INDEX IF NOT EXISTS idx_refund_credit_notes_status
  ON receipt.refund_credit_notes (status, issued_at DESC);

CREATE OR REPLACE FUNCTION receipt.fn_refund_credit_notes_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_refund_credit_notes_touch_updated_at ON receipt.refund_credit_notes;
CREATE TRIGGER tr_refund_credit_notes_touch_updated_at
  BEFORE UPDATE ON receipt.refund_credit_notes
  FOR EACH ROW
  EXECUTE PROCEDURE receipt.fn_refund_credit_notes_touch_updated_at();

COMMIT;

