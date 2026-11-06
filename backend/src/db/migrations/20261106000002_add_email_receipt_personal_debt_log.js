const FINANCE_SCHEMA = process.env.DB_SCHEMA_FINANCE || "finance";

exports.up = async function up(knex) {
  await knex.raw(`
    ALTER TABLE ${FINANCE_SCHEMA}.email_ingestion_receipts
      ADD COLUMN IF NOT EXISTS personal_debt_payment_log_id BIGINT
      REFERENCES ${FINANCE_SCHEMA}.debt_payment_logs(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_email_receipts_personal_debt_payment_log
      ON ${FINANCE_SCHEMA}.email_ingestion_receipts(personal_debt_payment_log_id)
      WHERE personal_debt_payment_log_id IS NOT NULL;
  `);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS ${FINANCE_SCHEMA}.idx_email_receipts_personal_debt_payment_log;

    ALTER TABLE ${FINANCE_SCHEMA}.email_ingestion_receipts
      DROP COLUMN IF EXISTS personal_debt_payment_log_id;
  `);
};
