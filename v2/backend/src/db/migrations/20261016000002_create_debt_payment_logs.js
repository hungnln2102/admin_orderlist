/**
 * Migration 20261016000002: Create Debt Payment Logs Table
 * Lưu trữ lịch sử thanh toán nợ / trả góp theo kỳ, hỗ trợ chống trùng lặp (double log).
 */

const schemaFinance = process.env.DB_SCHEMA_FINANCE || process.env.SCHEMA_FINANCE || "finance";

exports.up = async function (knex) {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaFinance};`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaFinance}.debt_payment_logs (
      id BIGSERIAL PRIMARY KEY,
      target_type VARCHAR(30) NOT NULL, -- 'INSTALLMENT' hoặc 'PERSONAL_DEBT'
      target_id BIGINT NOT NULL,
      period_month VARCHAR(7), -- Định dạng 'YYYY-MM' cho trả góp theo kỳ
      financial_account_id BIGINT REFERENCES ${schemaFinance}.financial_accounts(id),
      amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_target_period UNIQUE (target_id, period_month)
    );
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.debt_payment_logs CASCADE;`);
};
