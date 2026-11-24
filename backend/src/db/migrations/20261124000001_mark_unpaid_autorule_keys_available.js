function updateEntitlement(knex, unpaidStatus) {
  const orders = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "business";
  const warehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
  const qualified = (schema, name) => knex.raw("??.??", [schema, name]).toQuery();
  const orderTable = qualified(orders, "order_list");
  const keys = qualified(warehouse, "activation_keys");
  const syncKey = qualified(warehouse, "set_activation_key_entitlement");
  const syncOrder = qualified(warehouse, "sync_activation_keys_from_order");
  return knex.raw(`
    CREATE OR REPLACE FUNCTION ${syncKey}() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE order_status text;
    BEGIN
      IF NEW.status IN ('REVOKED', 'EXPIRED') THEN RETURN NEW; END IF;
      SELECT o.status INTO order_status
      FROM ${orderTable} AS o WHERE o.id_order = NEW.id_order FOR SHARE;
      NEW.status := CASE
        WHEN order_status IN ('PAID', 'RENEW_REQUIRED') THEN 'ACTIVATED'
        WHEN order_status = 'UNPAID' AND NEW.created_by = 'AutoRule' THEN '${unpaidStatus}'
        ELSE 'INACTIVE' END;
      RETURN NEW;
    END;
    $$;

    CREATE OR REPLACE FUNCTION ${syncOrder}() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE order_code text;
    DECLARE order_status text;
    BEGIN
      IF TG_OP = 'DELETE' THEN
        order_code := OLD.id_order;
      ELSE
        order_code := NEW.id_order;
        order_status := NEW.status;
      END IF;
      UPDATE ${keys}
      SET status = CASE
        WHEN order_status IN ('PAID', 'RENEW_REQUIRED') THEN 'ACTIVATED'
        WHEN order_status = 'UNPAID' AND created_by = 'AutoRule' THEN '${unpaidStatus}'
        ELSE 'INACTIVE' END, updated_at = CURRENT_TIMESTAMP
      WHERE id_order = order_code AND status IN ('AVAILABLE', 'INACTIVE', 'ACTIVATED')
        AND status <> CASE
          WHEN order_status IN ('PAID', 'RENEW_REQUIRED') THEN 'ACTIVATED'
          WHEN order_status = 'UNPAID' AND created_by = 'AutoRule' THEN '${unpaidStatus}'
          ELSE 'INACTIVE' END;
      RETURN NULL;
    END;
    $$;

    UPDATE ${keys} AS k SET status = '${unpaidStatus}', updated_at = CURRENT_TIMESTAMP
    FROM ${orderTable} AS o
    WHERE k.id_order = o.id_order AND o.status = 'UNPAID'
      AND k.created_by = 'AutoRule' AND k.status IN ('AVAILABLE', 'INACTIVE')
      AND k.status <> '${unpaidStatus}';
  `);
}

exports.up = (knex) => updateEntitlement(knex, "AVAILABLE");
exports.down = (knex) => updateEntitlement(knex, "INACTIVE");
