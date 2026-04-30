BEGIN;

CREATE SCHEMA IF NOT EXISTS receipt;

CREATE TABLE IF NOT EXISTS receipt.refund_credit_applications (
  id BIGSERIAL PRIMARY KEY,
  credit_note_id BIGINT NOT NULL
    REFERENCES receipt.refund_credit_notes(id) ON DELETE CASCADE,
  target_order_list_id INTEGER NULL
    REFERENCES orders.order_list(id) ON DELETE SET NULL,
  target_order_code VARCHAR(100) NOT NULL,
  payment_receipt_id BIGINT NULL
    REFERENCES receipt.payment_receipt(id) ON DELETE SET NULL,
  applied_amount NUMERIC(18,2) NOT NULL CHECK (applied_amount > 0),
  note TEXT NULL,
  applied_by VARCHAR(120) NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_credit_applications_credit_note
  ON receipt.refund_credit_applications (credit_note_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_refund_credit_applications_target_order_code
  ON receipt.refund_credit_applications (UPPER(TRIM(target_order_code)));

CREATE OR REPLACE FUNCTION receipt.fn_recompute_refund_credit_note_balance(p_credit_note_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_refund_amount NUMERIC(18,2) := 0;
  v_applied_amount NUMERIC(18,2) := 0;
  v_available_amount NUMERIC(18,2) := 0;
  v_status TEXT := 'OPEN';
BEGIN
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
    v_status := 'FULLY_APPLIED';
  ELSIF v_applied_amount > 0 THEN
    v_status := 'PARTIALLY_APPLIED';
  ELSE
    v_status := 'OPEN';
  END IF;

  UPDATE receipt.refund_credit_notes
  SET
    available_amount = v_available_amount,
    status = CASE
      WHEN status = 'VOID' THEN status
      ELSE v_status
    END,
    updated_at = NOW()
  WHERE id = p_credit_note_id;
END;
$$;

CREATE OR REPLACE FUNCTION receipt.fn_refund_credit_applications_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM receipt.fn_recompute_refund_credit_note_balance(OLD.credit_note_id);
    RETURN OLD;
  END IF;

  PERFORM receipt.fn_recompute_refund_credit_note_balance(NEW.credit_note_id);

  IF TG_OP = 'UPDATE' AND OLD.credit_note_id IS DISTINCT FROM NEW.credit_note_id THEN
    PERFORM receipt.fn_recompute_refund_credit_note_balance(OLD.credit_note_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_refund_credit_applications_after_change ON receipt.refund_credit_applications;
CREATE TRIGGER tr_refund_credit_applications_after_change
  AFTER INSERT OR UPDATE OR DELETE ON receipt.refund_credit_applications
  FOR EACH ROW
  EXECUTE PROCEDURE receipt.fn_refund_credit_applications_after_change();

COMMIT;

