-- Migration: 002_add_performance_indexes
-- Date: 2026-01-25
-- Description: Add indexes for frequently queried columns to improve performance

BEGIN;

-- ============================================
-- ORDERS SCHEMA INDEXES
-- ============================================

-- Index for scheduler queries: status + order_expired
-- Used in: scheduler.js (updateDatabaseTask) - WHERE status IN (...) AND order_expired < today
CREATE INDEX IF NOT EXISTS idx_order_list_status_expired 
ON orders.order_list(status, order_expired)
WHERE status IS NOT NULL AND order_expired IS NOT NULL;

-- Index for webhook lookup: id_order (case-insensitive)
-- Used in: webhook.js, renewal.js - WHERE LOWER(id_order) = ...
CREATE INDEX IF NOT EXISTS idx_order_list_id_order_lower 
ON orders.order_list(LOWER(id_order))
WHERE id_order IS NOT NULL;

-- Index for dashboard queries: order_date
-- Used in: DashboardController/queries.js - WHERE order_date BETWEEN ...
CREATE INDEX IF NOT EXISTS idx_order_list_order_date 
ON orders.order_list(order_date)
WHERE order_date IS NOT NULL;

-- Index for order_expired queries: order_date
-- Used in: DashboardController/queries.js - WHERE order_date BETWEEN ...
CREATE INDEX IF NOT EXISTS idx_order_expired_order_date 
ON orders.order_expired(order_date)
WHERE order_date IS NOT NULL;

-- Index for order_canceled queries: created_at (createdate)
-- Used in: DashboardController/queries.js - WHERE created_at BETWEEN ...
CREATE INDEX IF NOT EXISTS idx_order_canceled_created_at 
ON orders.order_canceled(createdate)
WHERE createdate IS NOT NULL;

-- ============================================
-- PARTNER SCHEMA INDEXES
-- ============================================

-- Index for payment queries: supplier_id + status
-- Used in: SuppliesController/handlers/insights.js, list.js - WHERE supplier_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_payment_supply_source_status 
ON partner.supplier_payments(supplier_id, status)
WHERE supplier_id IS NOT NULL;

-- Index for payment queries: supplier_id only (for list queries)
-- Used in: SuppliesController/handlers/list.js - WHERE supplier_id = ?
CREATE INDEX IF NOT EXISTS idx_payment_supply_source_id 
ON partner.supplier_payments(supplier_id)
WHERE supplier_id IS NOT NULL;

-- ============================================
-- PRODUCT SCHEMA INDEXES (if needed)
-- ============================================

-- Index for product lookups: variant displayName (if frequently searched)
-- Used in: ProductDescriptionsController - JOIN ON displayName
-- Note: Only add if this JOIN is slow in production
-- CREATE INDEX IF NOT EXISTS idx_variant_display_name_lower 
-- ON product.variant(LOWER(display_name))
-- WHERE display_name IS NOT NULL;

COMMIT;

-- ============================================
-- NOTES
-- ============================================
-- 
-- These indexes will improve performance for:
-- 1. Scheduler cron job (status + order_expired queries)
-- 2. Webhook order lookups (id_order case-insensitive)
-- 3. Dashboard statistics (order_date range queries)
-- 4. Payment/supplier queries (supplier_id + status)
--
-- Monitor query performance after applying:
-- - Use EXPLAIN ANALYZE on slow queries
-- - Check index usage with pg_stat_user_indexes
-- - Consider adding more indexes if needed based on actual usage
--
-- To verify indexes were created:
-- SELECT indexname, tablename, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname IN ('orders', 'partner') 
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
