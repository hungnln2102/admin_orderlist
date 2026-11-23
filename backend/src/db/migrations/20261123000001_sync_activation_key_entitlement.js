function names(knex) {
  const orders = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "business";
  const warehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
  const qualified = (schema, name) => knex.raw("??.??", [schema, name]).toQuery();
  return {
    orders: qualified(orders, "order_list"),
    keys: qualified(warehouse, "activation_keys"),
    syncOrder: qualified(warehouse, "sync_activation_keys_from_order"),
    syncKey: qualified(warehouse, "set_activation_key_entitlement"),
  };
}

exports.up = async (knex) => {
  const { orders, keys, syncOrder, syncKey } = names(knex);
  await knex.raw(`
    ALTER TABLE ${keys} ALTER COLUMN status SET DEFAULT 'INACTIVE';

    UPDATE ${keys} AS k
    SET status = CASE WHEN EXISTS (
      SELECT 1 FROM ${orders} AS o
      WHERE o.id_order = k.id_order AND o.status IN ('PAID', 'RENEW_REQUIRED')
    ) THEN 'ACTIVATED' ELSE 'INACTIVE' END
    WHERE k.status IN ('AVAILABLE', 'INACTIVE', 'ACTIVATED');

    CREATE FUNCTION ${syncKey}() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE order_status text;
    BEGIN
      IF NEW.status IN ('REVOKED', 'EXPIRED') THEN
        RETURN NEW;
      END IF;
      SELECT o.status INTO order_status
      FROM ${orders} AS o WHERE o.id_order = NEW.id_order FOR SHARE;
      NEW.status := CASE WHEN order_status IN ('PAID', 'RENEW_REQUIRED')
        THEN 'ACTIVATED' ELSE 'INACTIVE' END;
      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER set_activation_key_entitlement
    BEFORE INSERT OR UPDATE OF id_order ON ${keys}
    FOR EACH ROW EXECUTE FUNCTION ${syncKey}();

    CREATE FUNCTION ${syncOrder}() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE next_status text;
    DECLARE order_code text;
    BEGIN
      IF TG_OP = 'DELETE' THEN
        next_status := 'INACTIVE';
        order_code := OLD.id_order;
      ELSE
        next_status := CASE WHEN NEW.status IN ('PAID', 'RENEW_REQUIRED')
          THEN 'ACTIVATED' ELSE 'INACTIVE' END;
        order_code := NEW.id_order;
      END IF;
      UPDATE ${keys}
      SET status = next_status, updated_at = CURRENT_TIMESTAMP
      WHERE id_order = order_code AND status IN ('INACTIVE', 'ACTIVATED')
        AND status <> next_status;
      RETURN NULL;
    END;
    $$;

    CREATE TRIGGER sync_activation_keys_from_order
    AFTER UPDATE OF status OR DELETE ON ${orders}
    FOR EACH ROW EXECUTE FUNCTION ${syncOrder}();
  `);
};

exports.down = async (knex) => {
  const { orders, keys, syncOrder, syncKey } = names(knex);
  await knex.raw(`
    DROP TRIGGER sync_activation_keys_from_order ON ${orders};
    DROP TRIGGER set_activation_key_entitlement ON ${keys};
    DROP FUNCTION ${syncOrder}();
    DROP FUNCTION ${syncKey}();
    ALTER TABLE ${keys} ALTER COLUMN status SET DEFAULT 'AVAILABLE';
    UPDATE ${keys}
    SET status = CASE WHEN account_slot_id IS NOT NULL OR activated_at IS NOT NULL
      THEN 'ACTIVATED' ELSE 'AVAILABLE' END
    WHERE status IN ('INACTIVE', 'ACTIVATED');
  `);
};
