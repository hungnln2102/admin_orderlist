/**
 * Add optional variant tags to warehouse account services.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const schemaWarehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  await knex.raw(`
    ALTER TABLE ${schemaWarehouse}.account_slots
      ADD COLUMN IF NOT EXISTS variant_tag VARCHAR(100);

    CREATE INDEX IF NOT EXISTS idx_warehouse_account_slots_variant_tag
      ON ${schemaWarehouse}.account_slots (variant_tag);

    CREATE INDEX IF NOT EXISTS idx_warehouse_account_slots_name_variant_tag
      ON ${schemaWarehouse}.account_slots (name_id, variant_tag);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const schemaWarehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  await knex.raw(`
    DROP INDEX IF EXISTS ${schemaWarehouse}.idx_warehouse_account_slots_name_variant_tag;
    DROP INDEX IF EXISTS ${schemaWarehouse}.idx_warehouse_account_slots_variant_tag;
    ALTER TABLE ${schemaWarehouse}.account_slots DROP COLUMN IF EXISTS variant_tag;
  `);
};