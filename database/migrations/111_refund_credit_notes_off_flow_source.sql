BEGIN;

ALTER TABLE receipt.refund_credit_notes
  ADD COLUMN IF NOT EXISTS source_kind VARCHAR(40) NOT NULL DEFAULT 'ORDER_REFUND';

ALTER TABLE receipt.refund_credit_notes
  ADD COLUMN IF NOT EXISTS payment_receipt_id BIGINT NULL
  REFERENCES receipt.payment_receipt(id) ON DELETE SET NULL;

ALTER TABLE receipt.refund_credit_notes
  ADD COLUMN IF NOT EXISTS off_flow_month_key VARCHAR(7) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'refund_credit_notes_source_kind_ck'
  ) THEN
    ALTER TABLE receipt.refund_credit_notes
      ADD CONSTRAINT refund_credit_notes_source_kind_ck
      CHECK (source_kind IN ('ORDER_REFUND', 'OFF_FLOW_BANK'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_credit_notes_off_flow_receipt
  ON receipt.refund_credit_notes (payment_receipt_id)
  WHERE source_kind = 'OFF_FLOW_BANK' AND payment_receipt_id IS NOT NULL;

COMMENT ON COLUMN receipt.refund_credit_notes.source_kind IS
  'ORDER_REFUND = credit từ hoàn đơn; OFF_FLOW_BANK = credit từ tiền NH ngoài luồng.';
COMMENT ON COLUMN receipt.refund_credit_notes.payment_receipt_id IS
  'Biên lai Sepay gốc (idempotent — một biên lai một phiếu off-flow).';
COMMENT ON COLUMN receipt.refund_credit_notes.off_flow_month_key IS
  'Tháng YYYY-MM đã cộng total_off_flow_bank_receipt — dùng khi trừ lại lúc hoàn credit.';

COMMIT;
