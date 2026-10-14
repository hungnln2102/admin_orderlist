/**
 * Store the daily time used to credit configured profit.
 */

const schemaFinance = process.env.DB_SCHEMA_FINANCE || process.env.SCHEMA_FINANCE || "finance";

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaFinance}.personal_assets
      ADD COLUMN IF NOT EXISTS profit_credit_time VARCHAR(5) NULL;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaFinance}.personal_assets
      DROP COLUMN IF EXISTS profit_credit_time;
  `);
};
