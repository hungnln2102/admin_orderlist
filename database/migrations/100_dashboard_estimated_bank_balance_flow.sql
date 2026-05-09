-- Estimated bank balance flow columns.
ALTER TABLE dashboard.dashboard_monthly_summary
  ADD COLUMN IF NOT EXISTS estimated_bank_balance NUMERIC(18,2) NOT NULL DEFAULT 0;

ALTER TABLE dashboard.dashboard_financial_change_log
  ADD COLUMN IF NOT EXISTS bank_balance_delta NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_balance_snapshot NUMERIC(18,2) NOT NULL DEFAULT 0;
