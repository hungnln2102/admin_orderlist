-- Ép orders.order_list.refund luôn là số dương.

UPDATE orders.order_list
SET refund = ABS(COALESCE(refund, 0))
WHERE refund IS NOT NULL;

CREATE OR REPLACE FUNCTION orders.fn_order_list_refund_force_positive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.refund IS NOT NULL THEN
    NEW.refund := ABS(NEW.refund);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_order_list_refund_force_positive ON orders.order_list;
CREATE TRIGGER tr_order_list_refund_force_positive
  BEFORE INSERT OR UPDATE OF refund
  ON orders.order_list
  FOR EACH ROW
  EXECUTE PROCEDURE orders.fn_order_list_refund_force_positive();

