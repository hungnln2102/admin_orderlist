const FINANCE_SCHEMA = process.env.DB_SCHEMA_FINANCE || "finance";
const BILLING_SCHEMA = process.env.DB_SCHEMA_RECEIPT || process.env.SCHEMA_RECEIPT || "billing";

/**
 * Migration tạo bảng finance.store_profit_expenses:
 * Quản lý chi phí nhập hàng ngoài luồng (external_import) và chi phí biến đổi phát sinh trong tháng (monthly_expense, withdraw_profit).
 */
exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.store_profit_expenses (
      id BIGSERIAL PRIMARY KEY,
      amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
      reason TEXT,
      expense_type VARCHAR(50) NOT NULL DEFAULT 'external_import',
      expense_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
      linked_order_code VARCHAR(100),
      expense_meta JSONB,
      payment_receipt_id BIGINT REFERENCES ${BILLING_SCHEMA}.payment_receipt(id) ON DELETE SET NULL,
      shop_bank_account_id BIGINT REFERENCES ${FINANCE_SCHEMA}.financial_accounts(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'completed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_store_profit_expenses_date ON ${FINANCE_SCHEMA}.store_profit_expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_store_profit_expenses_type ON ${FINANCE_SCHEMA}.store_profit_expenses(expense_type);
    CREATE INDEX IF NOT EXISTS idx_store_profit_expenses_receipt ON ${FINANCE_SCHEMA}.store_profit_expenses(payment_receipt_id);
  `);
};

exports.down = async function (knex) {
  await knex.raw(`DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.store_profit_expenses CASCADE;`);
};
