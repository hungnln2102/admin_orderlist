const FINANCE_SCHEMA = process.env.DB_SCHEMA_FINANCE || "finance";

exports.up = async function up(knex) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.bank_instrument_mappings (
      id BIGSERIAL PRIMARY KEY,
      provider VARCHAR(32) NOT NULL DEFAULT 'VPBANK',
      instrument_kind VARCHAR(32) NOT NULL CHECK (instrument_kind IN ('CREDIT_CARD', 'DEBIT_CARD')),
      masked_suffix VARCHAR(8) NOT NULL,
      card_holder_name VARCHAR(128),
      product_hint VARCHAR(64),
      linked_credit_account_id BIGINT REFERENCES ${FINANCE_SCHEMA}.credit_accounts(id) ON DELETE RESTRICT,
      linked_financial_account_id BIGINT REFERENCES ${FINANCE_SCHEMA}.financial_accounts(id) ON DELETE RESTRICT,
      status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
      effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      effective_to TIMESTAMPTZ,
      approved_by VARCHAR(64),
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_bank_instrument_target CHECK (
        (instrument_kind = 'CREDIT_CARD' AND linked_credit_account_id IS NOT NULL AND linked_financial_account_id IS NULL) OR
        (instrument_kind = 'DEBIT_CARD' AND linked_financial_account_id IS NOT NULL AND linked_credit_account_id IS NULL)
      )
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bank_instrument_mapping
      ON ${FINANCE_SCHEMA}.bank_instrument_mappings(provider, instrument_kind, masked_suffix)
      WHERE status = 'ACTIVE';

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.email_sync_checkpoints (
      id BIGSERIAL PRIMARY KEY,
      provider VARCHAR(32) NOT NULL DEFAULT 'VPBANK_GMAIL',
      mailbox_alias VARCHAR(128) NOT NULL,
      folder_name VARCHAR(64) NOT NULL DEFAULT 'INBOX',
      uid_validity VARCHAR(64) NOT NULL,
      last_terminal_uid BIGINT NOT NULL DEFAULT 0,
      worker_state VARCHAR(32) NOT NULL DEFAULT 'STOPPED' CHECK (worker_state IN ('STOPPED', 'STARTING', 'IDLE', 'POLLING', 'PROCESSING', 'ERROR')),
      last_success_at TIMESTAMPTZ,
      last_error_code VARCHAR(64),
      last_error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_email_sync_checkpoint UNIQUE (provider, mailbox_alias, folder_name)
    );

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.email_ingestion_receipts (
      id BIGSERIAL PRIMARY KEY,
      provider VARCHAR(32) NOT NULL DEFAULT 'VPBANK_GMAIL',
      mailbox_alias VARCHAR(128) NOT NULL,
      folder_name VARCHAR(64) NOT NULL DEFAULT 'INBOX',
      uid_validity VARCHAR(64) NOT NULL,
      email_uid BIGINT NOT NULL,
      message_id VARCHAR(255),
      sender_address VARCHAR(255),
      subject TEXT,
      received_at TIMESTAMPTZ,
      subject_hash VARCHAR(64),
      body_hash VARCHAR(64),
      parse_version VARCHAR(16) NOT NULL DEFAULT '1.0',
      document_kind VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
      instrument_kind VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
      instrument_mask VARCHAR(32),
      instrument_mapping_id BIGINT REFERENCES ${FINANCE_SCHEMA}.bank_instrument_mappings(id) ON DELETE SET NULL,
      business_key VARCHAR(128),
      transaction_kind VARCHAR(32),
      amount NUMERIC(15, 2),
      status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PARSED', 'APPLIED', 'REJECTED', 'RETRYABLE_FAILED', 'MANUAL_REVIEW')),
      failure_code VARCHAR(64),
      failure_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      terminal_at TIMESTAMPTZ,
      ledger_id BIGINT,
      personal_debit_transaction_log_id BIGINT REFERENCES ${FINANCE_SCHEMA}.personal_debit_transaction_logs(id) ON DELETE SET NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_email_receipt_identity UNIQUE (provider, mailbox_alias, folder_name, uid_validity, email_uid)
    );

    CREATE INDEX IF NOT EXISTS idx_email_receipts_status
      ON ${FINANCE_SCHEMA}.email_ingestion_receipts(status, received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_receipts_business_key
      ON ${FINANCE_SCHEMA}.email_ingestion_receipts(business_key);

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.email_reconciliation_runs (
      id BIGSERIAL PRIMARY KEY,
      provider VARCHAR(32) NOT NULL DEFAULT 'VPBANK_GMAIL',
      mailbox_alias VARCHAR(128) NOT NULL,
      mode VARCHAR(16) NOT NULL DEFAULT 'DRY_RUN' CHECK (mode IN ('DRY_RUN', 'APPLY')),
      from_uid BIGINT,
      to_uid BIGINT,
      total_scanned INTEGER NOT NULL DEFAULT 0,
      total_applied INTEGER NOT NULL DEFAULT 0,
      total_manual_review INTEGER NOT NULL DEFAULT 0,
      total_rejected INTEGER NOT NULL DEFAULT 0,
      total_failed INTEGER NOT NULL DEFAULT 0,
      initiated_by VARCHAR(64),
      status VARCHAR(16) NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
      summary JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  `);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.email_reconciliation_runs;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.email_ingestion_receipts;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.email_sync_checkpoints;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.bank_instrument_mappings;
  `);
};


