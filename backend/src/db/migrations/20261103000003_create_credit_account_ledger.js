const FINANCE_SCHEMA = process.env.DB_SCHEMA_FINANCE || "finance";

exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.credit_accounts (
      id BIGSERIAL PRIMARY KEY,
      personal_asset_id BIGINT UNIQUE REFERENCES ${FINANCE_SCHEMA}.personal_assets(id) ON DELETE RESTRICT,
      product_kind VARCHAR(32) NOT NULL CHECK (product_kind IN ('CREDIT_CARD', 'OVERDRAFT')),
      bank_name VARCHAR(100),
      display_name VARCHAR(255) NOT NULL,
      timezone VARCHAR(64) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
      current_rule_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.credit_account_rule_versions (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES ${FINANCE_SCHEMA}.credit_accounts(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      effective_at TIMESTAMPTZ NOT NULL,
      config JSONB NOT NULL,
      evidence_reference VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (account_id, version)
    );

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.credit_statements (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES ${FINANCE_SCHEMA}.credit_accounts(id) ON DELETE RESTRICT,
      cycle_start_at TIMESTAMPTZ NOT NULL,
      cycle_close_at TIMESTAMPTZ NOT NULL,
      due_at TIMESTAMPTZ,
      opening_principal NUMERIC(18,2) NOT NULL DEFAULT 0,
      closing_principal NUMERIC(18,2) NOT NULL DEFAULT 0,
      interest_due NUMERIC(18,2) NOT NULL DEFAULT 0,
      fee_due NUMERIC(18,2) NOT NULL DEFAULT 0,
      minimum_due NUMERIC(18,2),
      total_due NUMERIC(18,2) NOT NULL DEFAULT 0,
      status VARCHAR(48) NOT NULL DEFAULT 'OPEN',
      rule_snapshot JSONB NOT NULL,
      source_reference VARCHAR(255),
      expected_interest_collection_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (account_id, cycle_close_at)
    );

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.credit_account_ledger (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES ${FINANCE_SCHEMA}.credit_accounts(id) ON DELETE RESTRICT,
      statement_id BIGINT REFERENCES ${FINANCE_SCHEMA}.credit_statements(id) ON DELETE RESTRICT,
      event_type VARCHAR(64) NOT NULL,
      bucket VARCHAR(64) NOT NULL,
      principal_delta NUMERIC(18,2) NOT NULL DEFAULT 0,
      interest_delta NUMERIC(18,2) NOT NULL DEFAULT 0,
      fee_delta NUMERIC(18,2) NOT NULL DEFAULT 0,
      effective_at TIMESTAMPTZ NOT NULL,
      source_reference VARCHAR(255),
      idempotency_key VARCHAR(255) NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (account_id, idempotency_key)
    );

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.credit_interest_accruals (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES ${FINANCE_SCHEMA}.credit_accounts(id) ON DELETE RESTRICT,
      statement_id BIGINT REFERENCES ${FINANCE_SCHEMA}.credit_statements(id) ON DELETE RESTRICT,
      business_date DATE NOT NULL,
      rule_version INTEGER NOT NULL,
      basis_amount NUMERIC(18,2) NOT NULL,
      rate_snapshot JSONB NOT NULL,
      interest_amount NUMERIC(18,2) NOT NULL,
      ledger_id BIGINT REFERENCES ${FINANCE_SCHEMA}.credit_account_ledger(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (account_id, business_date, rule_version)
    );

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.credit_payment_allocations (
      id BIGSERIAL PRIMARY KEY,
      payment_ledger_id BIGINT NOT NULL REFERENCES ${FINANCE_SCHEMA}.credit_account_ledger(id) ON DELETE RESTRICT,
      target_ledger_id BIGINT REFERENCES ${FINANCE_SCHEMA}.credit_account_ledger(id) ON DELETE RESTRICT,
      statement_id BIGINT REFERENCES ${FINANCE_SCHEMA}.credit_statements(id) ON DELETE RESTRICT,
      bucket VARCHAR(64) NOT NULL,
      amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.credit_reconciliation_records (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES ${FINANCE_SCHEMA}.credit_accounts(id) ON DELETE RESTRICT,
      statement_id BIGINT REFERENCES ${FINANCE_SCHEMA}.credit_statements(id) ON DELETE RESTRICT,
      source_kind VARCHAR(64) NOT NULL,
      source_reference VARCHAR(255),
      expected_amount NUMERIC(18,2),
      observed_amount NUMERIC(18,2),
      status VARCHAR(32) NOT NULL,
      evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_credit_ledger_account_effective
      ON ${FINANCE_SCHEMA}.credit_account_ledger(account_id, effective_at, id);
    CREATE INDEX IF NOT EXISTS idx_credit_statements_account_cycle
      ON ${FINANCE_SCHEMA}.credit_statements(account_id, cycle_close_at DESC);
    CREATE INDEX IF NOT EXISTS idx_credit_accruals_account_date
      ON ${FINANCE_SCHEMA}.credit_interest_accruals(account_id, business_date);
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.credit_reconciliation_records;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.credit_payment_allocations;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.credit_interest_accruals;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.credit_account_ledger;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.credit_statements;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.credit_account_rule_versions;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.credit_accounts;
  `);
};