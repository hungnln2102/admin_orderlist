/**
 * Store the selected financial account for profit payouts.
 */

const schemaFinance = process.env.DB_SCHEMA_FINANCE || process.env.SCHEMA_FINANCE || "finance";

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaFinance}.personal_assets
      ADD COLUMN IF NOT EXISTS profit_account_id BIGINT NULL;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaFinance}.personal_assets
      DROP COLUMN IF EXISTS profit_account_id;
  `);
};
