-- Chi phí shop gánh theo ngày (đồng bộ từ store_profit_expenses + cột snapshot trên daily summary).
ALTER TABLE dashboard.daily_revenue_summary
  ADD COLUMN IF NOT EXISTS total_shop_cost numeric(18,2) NOT NULL DEFAULT 0;
