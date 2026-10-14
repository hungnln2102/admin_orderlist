/**
 * Add profit configuration to savings and investment records.
 */

const schemaFinance = process.env.DB_SCHEMA_FINANCE || process.env.SCHEMA_FINANCE || "finance";

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaFinance}.personal_assets
      ADD COLUMN IF NOT EXISTS profit_enabled BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS profit_frequency VARCHAR(10) NULL,
      ADD COLUMN IF NOT EXISTS annual_interest_rate NUMERIC(8, 4) NULL,
      ADD COLUMN IF NOT EXISTS profit_destination VARCHAR(30) NULL;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaFinance}.personal_assets
      DROP COLUMN IF EXISTS profit_enabled,
      DROP COLUMN IF EXISTS profit_frequency,
      DROP COLUMN IF EXISTS annual_interest_rate,
      DROP COLUMN IF EXISTS profit_destination;
  `);
};
