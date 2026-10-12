/**
 * Migration 20261013000001: Warehouse Schema Refactoring & Table Consolidation
 * 1. Creates schema 'warehouse'
 * 2. Creates 'warehouse.product_names' (Master Catalog with product_id bridge & package/service notes)
 * 3. Creates 'warehouse.accounts' (Main warehouse accounts)
 * 4. Creates 'warehouse.account_slots' (Service slots inside accounts matching product_names)
 * 5. Creates 'warehouse.package_products' (Package inventory supporting single & dual storage accounts)
 */

exports.up = async function (knex) {
  // 1. Create warehouse schema
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS warehouse;`);

  // 2. Create warehouse.product_names (Master Catalog)
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS warehouse.product_names (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        product_id INT NULL REFERENCES business.product(id) ON DELETE SET NULL,
        package_note TEXT NULL,
        service_note TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_product_names_product_id ON warehouse.product_names(product_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_product_names_lower_name ON warehouse.product_names (LOWER(name));
  `);

  // 3. Create warehouse.accounts (Main Accounts)
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS warehouse.accounts (
        id SERIAL PRIMARY KEY,
        account_username VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_accounts_username ON warehouse.accounts (LOWER(account_username));
  `);

  // 4. Create warehouse.account_slots (Slots / Services inside accounts)
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS warehouse.account_slots (
        id SERIAL PRIMARY KEY,
        account_id INT NOT NULL REFERENCES warehouse.accounts(id) ON DELETE CASCADE,
        name_id INT NOT NULL REFERENCES warehouse.product_names(id) ON DELETE RESTRICT,
        password VARCHAR(255) NULL,
        backup_email VARCHAR(255) NULL,
        two_fa VARCHAR(255) NULL,
        expires_at TIMESTAMPTZ NULL,
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        service_note TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_account_service_slot UNIQUE (account_id, name_id)
    );

    CREATE INDEX IF NOT EXISTS idx_account_slots_account_id ON warehouse.account_slots(account_id);
    CREATE INDEX IF NOT EXISTS idx_account_slots_name_id ON warehouse.account_slots(name_id);
    CREATE INDEX IF NOT EXISTS idx_account_slots_status ON warehouse.account_slots(status);
    CREATE INDEX IF NOT EXISTS idx_account_slots_expires_at ON warehouse.account_slots(expires_at);
  `);

  // 5. Create warehouse.package_products (Package Inventory supporting single & dual storage accounts)
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS warehouse.package_products (
        id SERIAL PRIMARY KEY,
        product_name_id INT NOT NULL REFERENCES warehouse.product_names(id) ON DELETE CASCADE,
        account_id INT NOT NULL REFERENCES warehouse.accounts(id) ON DELETE CASCADE,
        supplier VARCHAR(255) DEFAULT 'Mavryk',
        cost DECIMAL(12, 2) DEFAULT 0,
        slot INT DEFAULT 2,
        package_note TEXT NULL,
        storage_account_id INT NULL REFERENCES warehouse.accounts(id) ON DELETE SET NULL,
        storage_total VARCHAR(100) NULL,
        match_rule VARCHAR(255) NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_package_products_account_id ON warehouse.package_products(account_id);
    CREATE INDEX IF NOT EXISTS idx_package_products_product_name_id ON warehouse.package_products(product_name_id);
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS warehouse.package_products CASCADE;
    DROP TABLE IF EXISTS warehouse.account_slots CASCADE;
    DROP TABLE IF EXISTS warehouse.accounts CASCADE;
    DROP TABLE IF EXISTS warehouse.product_names CASCADE;
    DROP SCHEMA IF EXISTS warehouse CASCADE;
  `);
};
