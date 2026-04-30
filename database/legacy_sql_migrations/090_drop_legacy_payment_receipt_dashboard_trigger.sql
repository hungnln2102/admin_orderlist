-- Revenue/profit are posted by webhook/manual-webhook application logic via
-- payment_receipt_financial_state + financial audit.
-- The legacy payment_receipt insert trigger only bumps total_revenue and causes
-- double counting when manual completion inserts a receipt then posts finance.

DROP TRIGGER IF EXISTS tr_payment_receipt_dashboard_revenue ON receipt.payment_receipt;
DROP FUNCTION IF EXISTS receipt.fn_bump_dashboard_monthly_revenue();
