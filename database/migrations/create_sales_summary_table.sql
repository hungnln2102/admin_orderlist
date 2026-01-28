-- Migration: Create sales_summary table
-- Purpose: Store daily sales summary for 30-day comparison reports
-- Schema: orders

CREATE TABLE IF NOT EXISTS orders.sales_summary (
  id SERIAL PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_cost NUMERIC(12, 2) DEFAULT 0,
  total_profit NUMERIC(12, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient date-based queries (descending order for recent dates first)
CREATE INDEX idx_sales_summary_date ON orders.sales_summary(summary_date DESC);

-- Comment on table
COMMENT ON TABLE orders.sales_summary IS 'Daily sales summary for reporting and analytics';
COMMENT ON COLUMN orders.sales_summary.summary_date IS 'Date of the sales summary';
COMMENT ON COLUMN orders.sales_summary.total_orders IS 'Total number of orders placed on this date';
COMMENT ON COLUMN orders.sales_summary.total_revenue IS 'Total revenue (price) from all orders';
COMMENT ON COLUMN orders.sales_summary.total_cost IS 'Total cost from all orders';
COMMENT ON COLUMN orders.sales_summary.total_profit IS 'Total profit (revenue - cost)';
COMMENT ON COLUMN orders.sales_summary.updated_at IS 'Last update timestamp';
