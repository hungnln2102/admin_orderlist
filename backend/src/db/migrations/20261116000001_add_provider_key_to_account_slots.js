/**
 * Add an optional OTP provider to each warehouse service slot.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const schemaWarehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  await knex.raw(`
    ALTER TABLE ${schemaWarehouse}.account_slots
      ADD COLUMN IF NOT EXISTS provider_key VARCHAR(100);

    CREATE INDEX IF NOT EXISTS idx_warehouse_account_slots_provider_key
      ON ${schemaWarehouse}.account_slots (provider_key);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const schemaWarehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  await knex.raw(`
    DROP INDEX IF EXISTS ${schemaWarehouse}.idx_warehouse_account_slots_provider_key;
    ALTER TABLE ${schemaWarehouse}.account_slots DROP COLUMN IF EXISTS provider_key;
  `);
};
