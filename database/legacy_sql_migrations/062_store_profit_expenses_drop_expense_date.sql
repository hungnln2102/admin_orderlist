-- Dùng created_at làm ngày nghiệp vụ, không tách riêng expense_date.

ALTER TABLE finance.store_profit_expenses
  DROP COLUMN IF EXISTS expense_date;
