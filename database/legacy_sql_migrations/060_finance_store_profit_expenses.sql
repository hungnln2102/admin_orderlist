-- Bảng chi phí ngoài luồng dùng chung cho:
-- - Rút lợi nhuận
-- - Đơn ngoài luồng

CREATE TABLE IF NOT EXISTS finance.store_profit_expenses (
  id BIGSERIAL PRIMARY KEY,
  amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  reason TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_type VARCHAR(30) NOT NULL
    CHECK (expense_type IN ('withdraw_profit', 'external_import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_profit_expenses_expense_date
  ON finance.store_profit_expenses(expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_store_profit_expenses_expense_type_date
  ON finance.store_profit_expenses(expense_type, expense_date DESC);
