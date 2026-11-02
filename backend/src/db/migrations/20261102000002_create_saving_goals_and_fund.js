const FINANCE_SCHEMA = process.env.DB_SCHEMA_FINANCE || "finance";

/**
 * Migration tạo bảng finance.saving_goals và finance.saving_fund_ledger
 * Phục vụ phân hệ 1 Quỹ Tích Lũy Mục Tiêu & Thang Cột Mốc Mục Tiêu (Milestone Target Ladder).
 */
exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.saving_goals (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_saving_goals_target_amount 
      ON ${FINANCE_SCHEMA}.saving_goals(target_amount ASC);
    CREATE INDEX IF NOT EXISTS idx_saving_goals_status 
      ON ${FINANCE_SCHEMA}.saving_goals(status);

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.saving_fund_ledger (
      id BIGSERIAL PRIMARY KEY,
      action_type VARCHAR(30) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
      balance_before NUMERIC(15, 2) NOT NULL,
      balance_after NUMERIC(15, 2) NOT NULL,
      goal_id BIGINT REFERENCES ${FINANCE_SCHEMA}.saving_goals(id) ON DELETE SET NULL,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_saving_fund_ledger_created_at 
      ON ${FINANCE_SCHEMA}.saving_fund_ledger(created_at DESC);
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.saving_fund_ledger CASCADE;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.saving_goals CASCADE;
  `);
};

