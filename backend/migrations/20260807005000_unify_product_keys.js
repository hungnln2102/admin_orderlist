exports.up = async function (knex) {
  await knex.raw(`
    -- 1. Rename product_stocks to product_keys and move it to business schema
    ALTER TABLE warehouse.product_stocks SET SCHEMA business;
    ALTER TABLE business.product_stocks RENAME TO product_keys;

    -- 2. Add columns from order_list_keys to business.product_keys
    ALTER TABLE business.product_keys
      ADD COLUMN order_list_id integer REFERENCES business.order_list(id) ON DELETE SET NULL,
      ADD COLUMN id_order varchar(50),
      ADD COLUMN key_hash text,
      ADD COLUMN key_hint varchar(50),
      ADD COLUMN expires_at date,
      ADD COLUMN system_code varchar(50) DEFAULT 'DEFAULT' REFERENCES system_automation.systems(system_code),
      ADD COLUMN status varchar(20) NOT NULL DEFAULT 'available',
      ALTER COLUMN created_at TYPE timestamp with time zone,
      ALTER COLUMN updated_at TYPE timestamp with time zone;

    -- 3. Update stock_services foreign key reference from product_stocks to product_keys
    -- Find and drop existing foreign key on warehouse.stock_services.stock_id
    ALTER TABLE warehouse.stock_services DROP CONSTRAINT IF EXISTS stock_services_stock_id_fkey;
    
    -- Recreate foreign key referencing business.product_keys
    ALTER TABLE warehouse.stock_services
      ADD CONSTRAINT stock_services_stock_id_fkey
      FOREIGN KEY (stock_id) REFERENCES business.product_keys(id) ON DELETE CASCADE;

    -- 4. Migrate any data from system_automation.order_list_keys to business.product_keys
    -- (Although count was 0 in dev, we write it to be safe for production migration)
    INSERT INTO business.product_keys (
      order_list_id, id_order, key_hash, key_hint, expires_at, system_code, status, created_at, updated_at
    )
    SELECT 
      order_list_id, id_order, key_hash, key_hint, expires_at, system_code, status, created_at, updated_at
    FROM system_automation.order_list_keys;

    -- 5. Drop the old table
    DROP TABLE IF EXISTS system_automation.order_list_keys CASCADE;

    -- 6. Update trigger function to point to business.product_keys
    CREATE OR REPLACE FUNCTION system_automation.sync_order_list_keys_after_order_update()
    RETURNS trigger AS $$
    BEGIN
      UPDATE business.product_keys k
      SET
        id_order = NEW.id_order,
        expires_at = NEW.expired_at,
        updated_at = NOW()
      WHERE k.order_list_id = NEW.id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    -- 1. Recreate order_list_keys
    CREATE TABLE system_automation.order_list_keys (
      id bigserial PRIMARY KEY,
      order_list_id integer REFERENCES business.order_list(id) ON DELETE SET NULL,
      id_order varchar(50),
      key_hash text,
      key_hint varchar(50),
      expires_at date,
      system_code varchar(50) DEFAULT 'DEFAULT' REFERENCES system_automation.systems(system_code),
      status varchar(50),
      created_at timestamp with time zone DEFAULT NOW(),
      updated_at timestamp with time zone DEFAULT NOW()
    );

    -- 2. Move data back to order_list_keys
    INSERT INTO system_automation.order_list_keys (
      order_list_id, id_order, key_hash, key_hint, expires_at, system_code, status, created_at, updated_at
    )
    SELECT 
      order_list_id, id_order, key_hash, key_hint, expires_at, system_code, status, created_at, updated_at
    FROM business.product_keys
    WHERE status <> 'available';

    -- 3. Restore warehouse.stock_services foreign key to point back to product_stocks
    ALTER TABLE warehouse.stock_services DROP CONSTRAINT IF EXISTS stock_services_stock_id_fkey;

    -- 4. Move product_keys back to warehouse.product_stocks
    ALTER TABLE business.product_keys RENAME TO product_stocks;
    ALTER TABLE business.product_stocks SET SCHEMA warehouse;

    -- Restore columns on warehouse.product_stocks
    ALTER TABLE warehouse.product_stocks
      DROP COLUMN IF EXISTS order_list_id,
      DROP COLUMN IF EXISTS id_order,
      DROP COLUMN IF EXISTS key_hash,
      DROP COLUMN IF EXISTS key_hint,
      DROP COLUMN IF EXISTS expires_at,
      DROP COLUMN IF EXISTS system_code,
      DROP COLUMN IF EXISTS status,
      ALTER COLUMN created_at TYPE timestamp without time zone,
      ALTER COLUMN updated_at TYPE timestamp without time zone;

    ALTER TABLE warehouse.stock_services
      ADD CONSTRAINT stock_services_stock_id_fkey
      FOREIGN KEY (stock_id) REFERENCES warehouse.product_stocks(id) ON DELETE CASCADE;

    -- 5. Restore trigger function to point to system_automation.order_list_keys
    CREATE OR REPLACE FUNCTION system_automation.sync_order_list_keys_after_order_update()
    RETURNS trigger AS $$
    BEGIN
      UPDATE system_automation.order_list_keys k
      SET
        id_order = NEW.id_order,
        expires_at = NEW.expired_at,
        updated_at = NOW()
      WHERE k.order_list_id = NEW.id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
};
