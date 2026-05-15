const { TABLES } = require("../../shared/constants");

/**
 * Helper insert vào `payment_receipt_financial_audit_log` với `source = 'reconcile'`.
 * Tách riêng để 5 chỗ trong reconcile dùng cùng 1 contract, dễ đổi khi cần thêm cột.
 */
const insertReconcileAuditLog = (trx, { receiptId, orderCode, ruleBranch, delta }) =>
  trx.raw(
    `INSERT INTO ${TABLES.paymentReceiptAudit} (payment_receipt_id, order_code, rule_branch, delta, source) VALUES (?, ?, ?, ?::jsonb, ?)`,
    [receiptId, orderCode, ruleBranch, JSON.stringify(delta ?? {}), "reconcile"]
  );

module.exports = { insertReconcileAuditLog };
