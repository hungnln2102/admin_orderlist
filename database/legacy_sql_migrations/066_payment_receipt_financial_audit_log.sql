-- Audit: mỗi lần ghi số / quyết định reconcile (receipt_id, nhánh rule, delta).
CREATE TABLE IF NOT EXISTS orders.payment_receipt_financial_audit_log (
  id BIGSERIAL PRIMARY KEY,
  payment_receipt_id BIGINT NOT NULL
    REFERENCES orders.payment_receipt(id) ON DELETE CASCADE,
  order_code TEXT NOT NULL DEFAULT '',
  rule_branch TEXT NOT NULL,
  delta JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'webhook',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_fin_audit_receipt_id
  ON orders.payment_receipt_financial_audit_log (payment_receipt_id);

CREATE INDEX IF NOT EXISTS idx_pr_fin_audit_branch
  ON orders.payment_receipt_financial_audit_log (rule_branch);

CREATE INDEX IF NOT EXISTS idx_pr_fin_audit_created
  ON orders.payment_receipt_financial_audit_log (created_at DESC);

COMMENT ON TABLE orders.payment_receipt_financial_audit_log IS
  'Lịch sử quyết định ghi doanh thu/lợi nhuận theo biên lai (webhook / reconcile).';
