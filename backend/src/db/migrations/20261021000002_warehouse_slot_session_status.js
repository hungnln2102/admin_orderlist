exports.up = async (knex) => {
  const schemaWarehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  await knex.raw(`
    ALTER TABLE ${schemaWarehouse}.account_slots
      ADD COLUMN IF NOT EXISTS session_is_authenticated BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS session_checked_at TIMESTAMPTZ;
  `);
};

exports.down = async (knex) => {
  const schemaWarehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  await knex.raw(`
    ALTER TABLE ${schemaWarehouse}.account_slots
      DROP COLUMN IF EXISTS session_checked_at,
      DROP COLUMN IF EXISTS session_is_authenticated;
  `);
};