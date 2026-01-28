-- Migration: Create sales summary MATERIALIZED VIEWS in PRODUCT schema
-- Purpose: Store daily sales summary for 30-day comparison reports
-- Schema: product
-- Pattern: Similar to product_sold_count, variant_sold_count, refresh_variant_sold_count

-- 1. Create product_sales_summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS product.product_sales_summary AS
SELECT 
  p.id::VARCHAR(255) AS product_id,
  DATE(o.order_date) AS summary_date,
  COUNT(DISTINCT o.id_order) AS total_orders,
  COUNT(o.id) AS total_quantity,
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0) AS total_revenue,
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0) AS total_cost,
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0) AS total_profit,
  NOW() AS updated_at
FROM orders.order_list o
JOIN product.variant v ON o.id_product = v.variant_name
JOIN product.product p ON v.product_id = p.id
WHERE o.order_date IS NOT NULL
GROUP BY p.id, DATE(o.order_date)

UNION ALL

SELECT 
  p.id::VARCHAR(255) AS product_id,
  DATE(o.order_date) AS summary_date,
  COUNT(DISTINCT o.id_order) AS total_orders,
  COUNT(o.id) AS total_quantity,
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0) AS total_revenue,
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0) AS total_cost,
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0) AS total_profit,
  NOW() AS updated_at
FROM orders.order_expired o
JOIN product.variant v ON o.id_product = v.variant_name
JOIN product.product p ON v.product_id = p.id
WHERE o.order_date IS NOT NULL
GROUP BY p.id, DATE(o.order_date);

-- 2. Create variant_sales_summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS product.variant_sales_summary AS
SELECT 
  v.id::VARCHAR(255) AS variant_id,
  p.id::VARCHAR(255) AS product_id,
  DATE(o.order_date) AS summary_date,
  COUNT(DISTINCT o.id_order) AS total_orders,
  COUNT(o.id) AS total_quantity,
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0) AS total_revenue,
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0) AS total_cost,
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0) AS total_profit,
  NOW() AS updated_at
FROM orders.order_list o
JOIN product.variant v ON o.id_product = v.variant_name
JOIN product.product p ON v.product_id = p.id
WHERE o.order_date IS NOT NULL
GROUP BY v.id, p.id, DATE(o.order_date)

UNION ALL

SELECT 
  v.id::VARCHAR(255) AS variant_id,
  p.id::VARCHAR(255) AS product_id,
  DATE(o.order_date) AS summary_date,
  COUNT(DISTINCT o.id_order) AS total_orders,
  COUNT(o.id) AS total_quantity,
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0) AS total_revenue,
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0) AS total_cost,
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0) AS total_profit,
  NOW() AS updated_at
FROM orders.order_expired o
JOIN product.variant v ON o.id_product = v.variant_name
JOIN product.product p ON v.product_id = p.id
WHERE o.order_date IS NOT NULL
GROUP BY v.id, p.id, DATE(o.order_date);

-- 3. Create daily_sales_summary materialized view (tổng hợp 30 ngày)
CREATE MATERIALIZED VIEW IF NOT EXISTS product.daily_sales_summary AS
SELECT 
  DATE(o.order_date) AS summary_date,
  COUNT(DISTINCT o.id_order) AS total_orders,
  COUNT(o.id) AS total_quantity,
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0) AS total_revenue,
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0) AS total_cost,
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0) AS total_profit,
  NOW() AS updated_at
FROM orders.order_list o
WHERE o.order_date IS NOT NULL
  AND DATE(o.order_date) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(o.order_date)

UNION ALL

SELECT 
  DATE(o.order_date) AS summary_date,
  COUNT(DISTINCT o.id_order) AS total_orders,
  COUNT(o.id) AS total_quantity,
  COALESCE(SUM(CAST(o.price AS NUMERIC)), 0) AS total_revenue,
  COALESCE(SUM(CAST(o.cost AS NUMERIC)), 0) AS total_cost,
  COALESCE(SUM(CAST(o.price AS NUMERIC) - CAST(o.cost AS NUMERIC)), 0) AS total_profit,
  NOW() AS updated_at
FROM orders.order_expired o
WHERE o.order_date IS NOT NULL
  AND DATE(o.order_date) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(o.order_date);

-- Create indexes on materialized views for better query performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sales_summary_unique 
  ON product.product_sales_summary(product_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_product_sales_summary_date 
  ON product.product_sales_summary(summary_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_variant_sales_summary_unique 
  ON product.variant_sales_summary(variant_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_variant_sales_summary_date 
  ON product.variant_sales_summary(summary_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_sales_summary_date 
  ON product.daily_sales_summary(summary_date DESC);

-- Function to refresh all sales summary materialized views
CREATE OR REPLACE FUNCTION product.refresh_sales_summary()
RETURNS TABLE(
  view_name TEXT,
  rows_affected BIGINT,
  refresh_time INTERVAL,
  status TEXT
) AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  row_count BIGINT;
BEGIN
  -- Refresh product_sales_summary
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY product.product_sales_summary;
  end_time := clock_timestamp();
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    'product_sales_summary'::TEXT,
    row_count,
    end_time - start_time,
    'SUCCESS'::TEXT;

  -- Refresh variant_sales_summary
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY product.variant_sales_summary;
  end_time := clock_timestamp();
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    'variant_sales_summary'::TEXT,
    row_count,
    end_time - start_time,
    'SUCCESS'::TEXT;

  -- Refresh daily_sales_summary
  start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW CONCURRENTLY product.daily_sales_summary;
  end_time := clock_timestamp();
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    'daily_sales_summary'::TEXT,
    row_count,
    end_time - start_time,
    'SUCCESS'::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    'ERROR'::TEXT,
    0::BIGINT,
    INTERVAL '0',
    SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Verify materialized views were created
SELECT 
  schemaname,
  matviewname as view_name,
  hasindexes,
  ispopulated
FROM pg_matviews 
WHERE schemaname = 'product' 
  AND matviewname IN ('product_sales_summary', 'variant_sales_summary', 'daily_sales_summary')
ORDER BY matviewname;
