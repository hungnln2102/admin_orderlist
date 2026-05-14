-- Log biến động tài chính dashboard theo tháng (append-only).
CREATE TABLE IF NOT EXISTS dashboard.dashboard_financial_change_log (
  id bigserial PRIMARY KEY,
  month_key text NOT NULL,
  revenue_delta numeric(18,2) NOT NULL DEFAULT 0,
  profit_delta numeric(18,2) NOT NULL DEFAULT 0,
  import_delta numeric(18,2) NOT NULL DEFAULT 0,
  refund_delta numeric(18,2) NOT NULL DEFAULT 0,
  off_flow_delta numeric(18,2) NOT NULL DEFAULT 0,
  tax_snapshot numeric(18,2) NOT NULL DEFAULT 0,
  off_flow_snapshot numeric(18,2) NOT NULL DEFAULT 0,
  available_profit_snapshot numeric(18,2) NOT NULL DEFAULT 0,
  context text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_fin_change_log_month_created
  ON dashboard.dashboard_financial_change_log (month_key, created_at DESC);
