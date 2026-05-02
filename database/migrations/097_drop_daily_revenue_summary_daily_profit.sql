-- Bỏ cột daily_profit (trùng allocated_profit_tax); gom một cột lợi nhuận ngày.
ALTER TABLE dashboard.daily_revenue_summary
  DROP COLUMN IF EXISTS daily_profit;
