
SELECT id, credit_code, customer_name, source_order_code, available_amount, status
FROM billing.refund_credit_notes
WHERE available_amount > 0 AND status IN ('OPEN', 'PARTIALLY_APPLIED')
ORDER BY id DESC;
