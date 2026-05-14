-- Tổng hợp doanh thu theo ngày (projection / báo cáo). Một hàng = một ngày (summary_date).
-- Chạy sau khi schema dashboard đã tồn tại (xem 075_move_finance_to_dashboard_schema.sql).

CREATE SCHEMA IF NOT EXISTS dashboard;

CREATE TABLE IF NOT EXISTS dashboard.daily_revenue_summary (
  summary_date date NOT NULL,
  earned_revenue numeric(18,2) NOT NULL DEFAULT 0,
  unearned_revenue_end numeric(18,2) NOT NULL DEFAULT 0,
  revenue_reversed numeric(18,2) NOT NULL DEFAULT 0,
  total_shop_cost numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_revenue_summary_pkey PRIMARY KEY (summary_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_revenue_summary_updated_at
  ON dashboard.daily_revenue_summary (updated_at DESC);
