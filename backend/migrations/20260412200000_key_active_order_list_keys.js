/**
 * Schema key_active: key kích hoạt ánh xạ orders.order_list (order_list_id = id).
 * expires_at đồng bộ với order_list.expired_at (trigger).
 * @see database/migrations/034_key_active_order_list_keys.sql
 */

exports.up = async function (knex) {
  await knex.raw(`
    CREATE SCHEMA IF NOT EXISTS key_active;
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS key_active.systems (
      system_code VARCHAR(64) PRIMARY KEY,
      system_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await knex.raw(`
    INSERT INTO key_active.systems (system_code, system_name)
    VALUES ('DEFAULT', 'Hệ thống mặc định')
    ON CONFLICT (system_code) DO NOTHING;
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS key_active.order_list_keys (
      id BIGSERIAL PRIMARY KEY,
      order_list_id INTEGER NOT NULL,
      id_order VARCHAR(50) NOT NULL,
      key_hash TEXT NOT NULL,
      key_hint VARCHAR(16),
      expires_at DATE,
      system_code VARCHAR(64),
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT order_list_keys_order_list_id_unique UNIQUE (order_list_id),
      CONSTRAINT order_list_keys_order_list_id_fk
        FOREIGN KEY (order_list_id) REFERENCES orders.order_list (id) ON DELETE CASCADE,
      CONSTRAINT order_list_keys_system_code_fk
        FOREIGN KEY (system_code) REFERENCES key_active.systems (system_code)
          ON UPDATE CASCADE ON DELETE SET NULL
    );
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_order_list_keys_id_order_upper
      ON key_active.order_list_keys (UPPER(TRIM(id_order)));
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_order_list_keys_expires_status
      ON key_active.order_list_keys (expires_at, status)
      WHERE status = 'active';
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION key_active.order_list_keys_enforce_from_order()
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
  `);

  await knex.raw(`
    DROP TRIGGER IF EXISTS tr_order_list_keys_bi_enforce ON key_active.order_list_keys;
    CREATE TRIGGER tr_order_list_keys_bi_enforce
      BEFORE INSERT OR UPDATE OF order_list_id ON key_active.order_list_keys
      FOR EACH ROW
      EXECUTE PROCEDURE key_active.order_list_keys_enforce_from_order();
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION key_active.sync_order_list_keys_after_order_update()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      UPDATE key_active.order_list_keys k
      SET
        id_order = NEW.id_order,
        expires_at = NEW.expired_at,
        updated_at = NOW()
      WHERE k.order_list_id = NEW.id;
      RETURN NEW;
    END;
    $$;
  `);

  await knex.raw(`
    DROP TRIGGER IF EXISTS tr_order_list_keys_sync_order ON orders.order_list;
    CREATE TRIGGER tr_order_list_keys_sync_order
      AFTER UPDATE OF expired_at, id_order ON orders.order_list
      FOR EACH ROW
      EXECUTE PROCEDURE key_active.sync_order_list_keys_after_order_update();
  `);
};

exports.down = async function (knex) {
  await knex.raw(
    `DROP TRIGGER IF EXISTS tr_order_list_keys_sync_order ON orders.order_list;`
  );
  await knex.raw(`DROP SCHEMA IF EXISTS key_active CASCADE;`);
};
