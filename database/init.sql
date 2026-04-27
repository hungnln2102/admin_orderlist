-- init.sql - Bootstrap schema for a brand-new Docker PostgreSQL volume.
-- PostgreSQL runs this file only when postgres_data is empty.
-- Keep this in sync with backend/migrations/20260411000000_baseline.js.

-- 1. Base schema.
\i /docker-entrypoint-initdb.d/migrations/000_full_schema.sql

-- 2. Consolidated schema updates needed by the current application.
\i /docker-entrypoint-initdb.d/migrations/055_supplier_order_cost_log_consolidated.sql
\i /docker-entrypoint-initdb.d/migrations/056_supplier_payments_drop_total_amount.sql
\i /docker-entrypoint-initdb.d/migrations/057_supplier_order_cost_log_webhook_paid_flow.sql
\i /docker-entrypoint-initdb.d/migrations/058_supplier_order_cost_log_default_unpaid.sql
\i /docker-entrypoint-initdb.d/migrations/058_supplier_payments_status_to_content.sql
\i /docker-entrypoint-initdb.d/migrations/059_supplier_payments_drop_payment_state.sql
\i /docker-entrypoint-initdb.d/migrations/060_finance_store_profit_expenses.sql
\i /docker-entrypoint-initdb.d/migrations/060_supplier_payments_one_row_per_supply.sql
\i /docker-entrypoint-initdb.d/migrations/061_store_profit_expenses_drop_updated_at.sql
\i /docker-entrypoint-initdb.d/migrations/062_store_profit_expenses_drop_expense_date.sql
\i /docker-entrypoint-initdb.d/migrations/063_payment_receipt_sepay_dedupe.sql
\i /docker-entrypoint-initdb.d/migrations/064_payment_receipt_drop_sub_account.sql
\i /docker-entrypoint-initdb.d/migrations/065_payment_receipt_financial_state.sql
\i /docker-entrypoint-initdb.d/migrations/066_payment_receipt_financial_audit_log.sql
\i /docker-entrypoint-initdb.d/migrations/067_supplier_order_cost_log_refund_note_only.sql
\i /docker-entrypoint-initdb.d/migrations/068_refund_columns_force_positive.sql
\i /docker-entrypoint-initdb.d/migrations/069_order_list_refund_force_positive.sql
\i /docker-entrypoint-initdb.d/migrations/070_fix_zero_import_when_no_refund.sql
\i /docker-entrypoint-initdb.d/migrations/071_move_identity_and_audit_to_customer_web.sql
\i /docker-entrypoint-initdb.d/migrations/072_move_customer_to_customer_info.sql
\i /docker-entrypoint-initdb.d/migrations/073_move_receipt_tables_to_receipt_schema.sql
\i /docker-entrypoint-initdb.d/migrations/074_move_reviews_to_product_schema.sql
\i /docker-entrypoint-initdb.d/migrations/074_payment_receipt_batch_code.sql
\i /docker-entrypoint-initdb.d/migrations/075_move_finance_to_dashboard_schema.sql
\i /docker-entrypoint-initdb.d/migrations/076_move_tier_cycles_to_customer_web.sql
\i /docker-entrypoint-initdb.d/migrations/077_merge_customer_info_into_customer_web.sql
\i /docker-entrypoint-initdb.d/migrations/078_merge_key_active_into_system_automation.sql
\i /docker-entrypoint-initdb.d/migrations/079_pending_refund_label_chua_hoan.sql
\i /docker-entrypoint-initdb.d/migrations/080_create_refund_credit_notes.sql
\i /docker-entrypoint-initdb.d/migrations/080_supplier_order_cost_log_ncc_refund_on_cancel.sql
\i /docker-entrypoint-initdb.d/migrations/081_create_refund_credit_applications.sql
\i /docker-entrypoint-initdb.d/migrations/082_fix_order_list_keys_trigger_to_system_automation.sql
\i /docker-entrypoint-initdb.d/migrations/083_order_list_created_at_event_bucketing.sql
\i /docker-entrypoint-initdb.d/migrations/084_order_list_gross_selling_price.sql
\i /docker-entrypoint-initdb.d/migrations/085_refund_credit_note_split_links.sql

-- 3. Default seed data.
\i /docker-entrypoint-initdb.d/seeds/seed_hero_banners_website_defaults.sql
