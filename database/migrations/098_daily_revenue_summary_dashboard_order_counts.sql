-- Đếm đơn / đơn hủy cho biểu đồ dashboard — chỉ đơn có mốc >= tax_from trong job backfill (khớp kỳ khai thuế).
ALTER TABLE dashboard.daily_revenue_summary
  ADD COLUMN IF NOT EXISTS dashboard_orders_count bigint NOT NULL DEFAULT 0;

ALTER TABLE dashboard.daily_revenue_summary
  ADD COLUMN IF NOT EXISTS dashboard_canceled_count bigint NOT NULL DEFAULT 0;
