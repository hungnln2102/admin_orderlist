/**
 * Store repayment and interest settings for personal debt records.
 */

const schemaFinance = process.env.DB_SCHEMA_FINANCE || process.env.SCHEMA_FINANCE || "finance";

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaFinance}.personal_assets
      ADD COLUMN IF NOT EXISTS debt_interest_enabled BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS debt_annual_interest_rate NUMERIC(8, 4) NULL,
      ADD COLUMN IF NOT EXISTS debt_due_day SMALLINT NULL,
      ADD COLUMN IF NOT EXISTS debt_end_date DATE NULL,
      ADD COLUMN IF NOT EXISTS debt_repayment_frequency VARCHAR(10) NULL;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaFinance}.personal_assets
      DROP COLUMN IF EXISTS debt_interest_enabled,
      DROP COLUMN IF EXISTS debt_annual_interest_rate,
      DROP COLUMN IF EXISTS debt_due_day,
      DROP COLUMN IF EXISTS debt_end_date,
      DROP COLUMN IF EXISTS debt_repayment_frequency;
  `);
};
