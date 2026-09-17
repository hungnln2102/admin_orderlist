-- Migration 115: Compound indexes for Dashboard Range Stats & Order List Date Filtering
DROP INDEX IF EXISTS business.idx_order_list_status_dates;
CREATE INDEX idx_order_list_status_dates
  ON business.order_list (status, order_date, created_at);

DROP INDEX IF EXISTS billing.idx_payment_receipt_paid_date_id_order;
CREATE INDEX idx_payment_receipt_paid_date_id_order
  ON billing.payment_receipt (payment_date, id_order);
