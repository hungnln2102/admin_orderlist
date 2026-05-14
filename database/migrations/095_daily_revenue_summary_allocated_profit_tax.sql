-- Lợi nhuận phân bổ khớp tab «Lợi nhuận» Form phân bổ thuế (MAVC/L/K/S, (price-cost)/term).
ALTER TABLE dashboard.daily_revenue_summary
  ADD COLUMN IF NOT EXISTS allocated_profit_tax numeric(18,2) NOT NULL DEFAULT 0;
