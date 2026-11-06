const FINANCE_SCHEMA = process.env.DB_SCHEMA_FINANCE || "finance";

exports.up = async function up(knex) {
  await knex.raw(`
    ALTER TABLE ${FINANCE_SCHEMA}.personal_assets
      ADD COLUMN IF NOT EXISTS debt_kind VARCHAR(32),
      ADD COLUMN IF NOT EXISTS debt_initial_limit NUMERIC(18,2),
      ADD COLUMN IF NOT EXISTS debt_account_number VARCHAR(64);

    UPDATE ${FINANCE_SCHEMA}.personal_assets
      SET debt_kind = 'PERSONAL_EXTERNAL'
      WHERE type = 'DEBT_PAYABLE' AND debt_kind IS NULL;

    ALTER TABLE ${FINANCE_SCHEMA}.personal_assets
      DROP CONSTRAINT IF EXISTS chk_personal_assets_debt_kind;
    ALTER TABLE ${FINANCE_SCHEMA}.personal_assets
      ADD CONSTRAINT chk_personal_assets_debt_kind CHECK (
        debt_kind IS NULL OR debt_kind IN ('PERSONAL_EXTERNAL', 'CREDIT_CARD', 'OVERDRAFT')
      );
    ALTER TABLE ${FINANCE_SCHEMA}.personal_assets
      DROP CONSTRAINT IF EXISTS chk_personal_assets_debt_initial_limit;
    ALTER TABLE ${FINANCE_SCHEMA}.personal_assets
      ADD CONSTRAINT chk_personal_assets_debt_initial_limit CHECK (
        debt_initial_limit IS NULL OR debt_initial_limit >= 0
      );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_personal_debt_account_number
      ON ${FINANCE_SCHEMA}.personal_assets(debt_account_number)
      WHERE type = 'DEBT_PAYABLE' AND debt_account_number IS NOT NULL;

    ALTER TABLE ${FINANCE_SCHEMA}.bank_instrument_mappings
      ADD COLUMN IF NOT EXISTS account_number VARCHAR(64);
    ALTER TABLE ${FINANCE_SCHEMA}.bank_instrument_mappings
      DROP CONSTRAINT IF EXISTS bank_instrument_mappings_instrument_kind_check;
    ALTER TABLE ${FINANCE_SCHEMA}.bank_instrument_mappings
      ADD CONSTRAINT chk_bank_instrument_kind CHECK (instrument_kind IN ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT'));
    ALTER TABLE ${FINANCE_SCHEMA}.bank_instrument_mappings
      DROP CONSTRAINT IF EXISTS chk_bank_instrument_target;
    ALTER TABLE ${FINANCE_SCHEMA}.bank_instrument_mappings
      ADD CONSTRAINT chk_bank_instrument_target CHECK (
        (instrument_kind = 'CREDIT_CARD' AND linked_credit_account_id IS NOT NULL AND linked_financial_account_id IS NULL) OR
        (instrument_kind = 'DEBIT_CARD' AND linked_financial_account_id IS NOT NULL AND linked_credit_account_id IS NULL) OR
        (instrument_kind = 'BANK_ACCOUNT' AND (
          (linked_credit_account_id IS NOT NULL AND linked_financial_account_id IS NULL) OR
          (linked_credit_account_id IS NULL AND linked_financial_account_id IS NOT NULL)
        ))
      );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bank_instrument_account_number
      ON ${FINANCE_SCHEMA}.bank_instrument_mappings(provider, account_number)
      WHERE status = 'ACTIVE' AND account_number IS NOT NULL;

    ALTER TABLE ${FINANCE_SCHEMA}.email_ingestion_receipts
      ADD COLUMN IF NOT EXISTS source_account_number VARCHAR(64);
  `);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS ${FINANCE_SCHEMA}.uq_active_bank_instrument_account_number;
    DROP INDEX IF EXISTS ${FINANCE_SCHEMA}.uq_personal_debt_account_number;
    ALTER TABLE ${FINANCE_SCHEMA}.email_ingestion_receipts
      DROP COLUMN IF EXISTS source_account_number;
    ALTER TABLE ${FINANCE_SCHEMA}.bank_instrument_mappings
      DROP COLUMN IF EXISTS account_number;
    ALTER TABLE ${FINANCE_SCHEMA}.personal_assets
      DROP COLUMN IF EXISTS debt_account_number,
      DROP COLUMN IF EXISTS debt_initial_limit,
      DROP COLUMN IF EXISTS debt_kind;
  `);
};