BEGIN;

CREATE SCHEMA IF NOT EXISTS system_automation;

-- Recreate functions in system_automation and repoint trigger on orders.order_list.
CREATE OR REPLACE FUNCTION system_automation.order_list_keys_enforce_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_exp DATE;
  v_code VARCHAR(50);
BEGIN
  SELECT o.expired_at, o.id_order INTO v_exp, v_code
  FROM orders.order_list o
  WHERE o.id = NEW.order_list_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_list_id % không tồn tại trong orders.order_list', NEW.order_list_id;
  END IF;

  NEW.expires_at := v_exp;
  NEW.id_order := COALESCE(NULLIF(TRIM(v_code), ''), NULLIF(TRIM(NEW.id_order), ''));
  IF NEW.id_order IS NULL THEN
    RAISE EXCEPTION 'order_list_id %: id_order trống trên order_list', NEW.order_list_id;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_order_list_keys_bi_enforce ON system_automation.order_list_keys;
CREATE TRIGGER tr_order_list_keys_bi_enforce
  BEFORE INSERT OR UPDATE OF order_list_id ON system_automation.order_list_keys
  FOR EACH ROW
  EXECUTE PROCEDURE system_automation.order_list_keys_enforce_from_order();

CREATE OR REPLACE FUNCTION system_automation.sync_order_list_keys_after_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE system_automation.order_list_keys k
  SET
    id_order = NEW.id_order,
    expires_at = NEW.expired_at,
    updated_at = NOW()
  WHERE k.order_list_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_order_list_keys_sync_order ON orders.order_list;
CREATE TRIGGER tr_order_list_keys_sync_order
  AFTER UPDATE OF expired_at, id_order ON orders.order_list
  FOR EACH ROW
  EXECUTE PROCEDURE system_automation.sync_order_list_keys_after_order_update();

COMMIT;

