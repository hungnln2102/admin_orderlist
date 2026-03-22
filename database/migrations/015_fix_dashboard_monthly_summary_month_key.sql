CREATE SCHEMA IF NOT EXISTS finance;

CREATE TABLE IF NOT EXISTS finance.dashboard_monthly_summary (
  month_key varchar(7) PRIMARY KEY,
  total_orders integer NOT NULL DEFAULT 0,
  canceled_orders integer NOT NULL DEFAULT 0,
  total_revenue numeric(18,2) NOT NULL DEFAULT 0,
  total_profit numeric(18,2) NOT NULL DEFAULT 0,
  total_refund numeric(18,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finance.dashboard_monthly_summary
  ALTER COLUMN month_key TYPE varchar(7)
  USING LEFT(month_key::text, 7);

ALTER TABLE finance.dashboard_monthly_summary
  ALTER COLUMN month_key SET NOT NULL;

ALTER TABLE finance.dashboard_monthly_summary
  ALTER COLUMN total_orders SET DEFAULT 0,
  ALTER COLUMN canceled_orders SET DEFAULT 0,
  ALTER COLUMN total_revenue SET DEFAULT 0,
  ALTER COLUMN total_profit SET DEFAULT 0,
  ALTER COLUMN total_refund SET DEFAULT 0,
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE finance.dashboard_monthly_summary
  DROP CONSTRAINT IF EXISTS dashboard_monthly_summary_month_key_format;

ALTER TABLE finance.dashboard_monthly_summary
  ADD CONSTRAINT dashboard_monthly_summary_month_key_format
  CHECK (month_key ~ '^[0-9]{4}-[0-9]{2}$');

CREATE INDEX IF NOT EXISTS idx_dashboard_monthly_summary_updated_at
  ON finance.dashboard_monthly_summary (updated_at DESC);
