-- balance_scope: per_row = default; column_total = same per-day storage, UI shows SUM footer (legacy 1900-01-01 rows removed in 038).

ALTER TABLE finance.master_wallettypes
  ADD COLUMN IF NOT EXISTS balance_scope VARCHAR(20) NOT NULL DEFAULT 'per_row';

ALTER TABLE finance.master_wallettypes
  DROP CONSTRAINT IF EXISTS master_wallettypes_balance_scope_check;

ALTER TABLE finance.master_wallettypes
  ADD CONSTRAINT master_wallettypes_balance_scope_check
  CHECK (balance_scope IN ('per_row', 'column_total'));
