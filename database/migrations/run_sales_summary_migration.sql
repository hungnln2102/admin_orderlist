-- Manual Migration Script for Sales Summary Table
-- Run this script manually on your PostgreSQL database

-- Step 1: Connect to your database
-- psql -U admin -h 110.172.28.206 -d mydtbmav

-- Step 2: Run the migration
\c mydtbmav

-- Create the sales_summary table
CREATE TABLE IF NOT EXISTS orders.sales_summary (
  id SERIAL PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_cost NUMERIC(12, 2) DEFAULT 0,
  total_profit NUMERIC(12, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_sales_summary_date ON orders.sales_summary(summary_date DESC);

-- Add comments
COMMENT ON TABLE orders.sales_summary IS 'Daily sales summary for reporting and analytics';
COMMENT ON COLUMN orders.sales_summary.summary_date IS 'Date of the sales summary';
COMMENT ON COLUMN orders.sales_summary.total_orders IS 'Total number of orders placed on this date';
COMMENT ON COLUMN orders.sales_summary.total_revenue IS 'Total revenue (price) from all orders';
COMMENT ON COLUMN orders.sales_summary.total_cost IS 'Total cost from all orders';
COMMENT ON COLUMN orders.sales_summary.total_profit IS 'Total profit (revenue - cost)';
COMMENT ON COLUMN orders.sales_summary.updated_at IS 'Last update timestamp';

-- Step 3: Verify the table was created
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'orders' AND table_name = 'sales_summary';

-- Step 4: Check the table structure
\d orders.sales_summary
