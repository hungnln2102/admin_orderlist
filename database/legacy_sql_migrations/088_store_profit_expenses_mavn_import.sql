-- Loại mavn_import: chi phí gắn mã MAVN (nhập hàng), đồng bộ khi đơn Đã TT.
ALTER TABLE finance.store_profit_expenses
  DROP CONSTRAINT IF EXISTS store_profit_expenses_expense_type_check;

ALTER TABLE finance.store_profit_expenses
  ADD CONSTRAINT store_profit_expenses_expense_type_check
  CHECK (expense_type IN ('withdraw_profit', 'external_import', 'mavn_import'));

ALTER TABLE finance.store_profit_expenses
  ADD COLUMN IF NOT EXISTS linked_order_code VARCHAR(120),
  ADD COLUMN IF NOT EXISTS expense_meta JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_profit_expenses_mavn_order
  ON finance.store_profit_expenses (linked_order_code)
  WHERE expense_type = 'mavn_import'
    AND linked_order_code IS NOT NULL
    AND btrim(linked_order_code::text) <> '';
