BEGIN;

-- Liên kết tách dòng: phiếu cũ hết dùng (VOID), phiếu mới giữ số còn lại; application vẫn trỏ tới id phiếu cũ (audit).
ALTER TABLE receipt.refund_credit_notes
  ADD COLUMN IF NOT EXISTS split_from_note_id BIGINT NULL
    REFERENCES receipt.refund_credit_notes (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS succeeded_by_note_id BIGINT NULL
    REFERENCES receipt.refund_credit_notes (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_refund_credit_notes_split_from
  ON receipt.refund_credit_notes (split_from_note_id) WHERE split_from_note_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refund_credit_notes_succeeded_by
  ON receipt.refund_credit_notes (succeeded_by_note_id) WHERE succeeded_by_note_id IS NOT NULL;

COMMENT ON COLUMN receipt.refund_credit_notes.split_from_note_id IS
  'Nếu set: phiếu này tạo từ tách số còn lại khi dùng một phần credit ở phiếu nguồn.';
COMMENT ON COLUMN receipt.refund_credit_notes.succeeded_by_note_id IS
  'Phiếu mới tạo từ số còn lại; phiếu này chuyển sang VOID, không còn dùng.';

-- Phiếu VOID không bị trigger ghi đè available từ tổng application (cố định số 0, giữ sổ cũ).
CREATE OR REPLACE FUNCTION receipt.fn_recompute_refund_credit_note_balance(p_credit_note_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
  v_refund_amount NUMERIC(18,2) := 0;
  v_applied_amount NUMERIC(18,2) := 0;
  v_available_amount NUMERIC(18,2) := 0;
  v_new_status TEXT := 'OPEN';
BEGIN
  SELECT UPPER(TRIM(COALESCE(status::text, '')))
  INTO v_status
  FROM receipt.refund_credit_notes
  WHERE id = p_credit_note_id;

  IF v_status = 'VOID' THEN
    RETURN;
  END IF;

  SELECT COALESCE(refund_amount, 0)
  INTO v_refund_amount
  FROM receipt.refund_credit_notes
  WHERE id = p_credit_note_id;

  SELECT COALESCE(SUM(applied_amount), 0)
  INTO v_applied_amount
  FROM receipt.refund_credit_applications
  WHERE credit_note_id = p_credit_note_id;

  v_available_amount := GREATEST(0, v_refund_amount - v_applied_amount);

  IF v_available_amount <= 0 THEN
    v_new_status := 'FULLY_APPLIED';
  ELSIF v_applied_amount > 0 THEN
    v_new_status := 'PARTIALLY_APPLIED';
  ELSE
    v_new_status := 'OPEN';
  END IF;

  UPDATE receipt.refund_credit_notes
  SET
    available_amount = v_available_amount,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_credit_note_id
    AND UPPER(TRIM(COALESCE(status::text, ''))) <> 'VOID';
END;
$$;

COMMIT;
