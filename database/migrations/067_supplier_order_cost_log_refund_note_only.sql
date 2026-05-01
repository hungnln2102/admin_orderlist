-- Chuẩn hóa log hoàn tiền NCC:
-- - Dòng log có refund_amount khác 0 chỉ ghi số tiền hoàn.
-- - import_cost trên dòng này luôn bằng 0 để không làm lệch báo cáo.

CREATE OR REPLACE FUNCTION partner.fn_supplier_order_cost_log_refund_note_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.refund_amount := ABS(COALESCE(NEW.refund_amount, 0));
  IF COALESCE(NEW.refund_amount, 0) > 0 THEN
    NEW.import_cost := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_refund_note_only ON partner.supplier_order_cost_log;
CREATE TRIGGER tr_supplier_order_cost_log_refund_note_only
  BEFORE INSERT OR UPDATE OF import_cost, refund_amount
  ON partner.supplier_order_cost_log
  FOR EACH ROW
  EXECUTE PROCEDURE partner.fn_supplier_order_cost_log_refund_note_only();

