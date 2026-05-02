-- Lợi nhuận phân bổ theo ngày (khớp tab Lợi nhuận Form phân bổ thuế). Đồng bộ từ allocated_profit_tax khi cột đó đã có.
ALTER TABLE dashboard.daily_revenue_summary
  ADD COLUMN IF NOT EXISTS daily_profit numeric(18,2) NOT NULL DEFAULT 0;

UPDATE dashboard.daily_revenue_summary
SET daily_profit = allocated_profit_tax;
