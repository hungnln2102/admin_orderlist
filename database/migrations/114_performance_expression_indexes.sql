-- Migration 114: Expression and Performance Indexes for Order List & Payment Receipts
-- Purpose: Fix index expression mismatch between SQL query LOWER(TRIM(...)) and existing indexes.

-- 1. Expression Index on billing.payment_receipt for LOWER(TRIM(COALESCE(id_order, ''::text)))
DROP INDEX IF EXISTS billing.idx_payment_receipt_id_order_lower_trim;
CREATE INDEX idx_payment_receipt_id_order_lower_trim 
  ON billing.payment_receipt (LOWER(TRIM(COALESCE(id_order, ''::text))));

-- 2. Expression Index on business.order_list for LOWER(TRIM(COALESCE(id_order, ''::text)))
DROP INDEX IF EXISTS business.idx_order_list_id_order_lower_trim;
CREATE INDEX idx_order_list_id_order_lower_trim 
  ON business.order_list (LOWER(TRIM(COALESCE(id_order, ''::text))));

-- 3. Composite Index on billing.payment_receipt_financial_audit_log for audit queries
DROP INDEX IF EXISTS billing.idx_payment_receipt_audit_receipt_rule;
CREATE INDEX idx_payment_receipt_audit_receipt_rule 
  ON billing.payment_receipt_financial_audit_log (payment_receipt_id, rule_branch);

-- 4. Foreign key & status indexes for refund credit notes and applications
DROP INDEX IF EXISTS billing.idx_refund_credit_notes_source_order_status;
CREATE INDEX idx_refund_credit_notes_source_order_status 
  ON billing.refund_credit_notes (source_order_list_id, status);

DROP INDEX IF EXISTS billing.idx_refund_credit_applications_target_order;
CREATE INDEX idx_refund_credit_applications_target_order 
  ON billing.refund_credit_applications (target_order_list_id);
