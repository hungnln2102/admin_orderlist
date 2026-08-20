const { db } = require("@/db");
const logger = require("@/utils/logger");
const {
  TABLES,
  PAYMENT_RECEIPT_DEF,
  PAYMENT_RECEIPT_AUDIT_DEF,
  FLOW_TYPE_COLS,
} = require("@/domains/payments/controller/shared/constants");

const OUTBOUND_RULE_BRANCH = "OUTBOUND_TRANSFER_BANK_BALANCE_DEBIT";

const loadOutboundAuditMap = async (receiptIds = []) => {
  const uniqueIds = Array.from(
    new Set((receiptIds || []).map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))
  );
  if (!uniqueIds.length) return new Map();

  const auditRows = await db({ audit: TABLES.paymentReceiptAudit })
    .select({
      paymentReceiptId: `audit.${PAYMENT_RECEIPT_AUDIT_DEF.columns.paymentReceiptId}`,
      ruleBranch: `audit.${PAYMENT_RECEIPT_AUDIT_DEF.columns.ruleBranch}`,
      delta: `audit.${PAYMENT_RECEIPT_AUDIT_DEF.columns.delta}`,
      createdAt: `audit.${PAYMENT_RECEIPT_AUDIT_DEF.columns.createdAt}`,
    })
    .whereIn(`audit.${PAYMENT_RECEIPT_AUDIT_DEF.columns.paymentReceiptId}`, uniqueIds)
    .andWhere(`audit.${PAYMENT_RECEIPT_AUDIT_DEF.columns.ruleBranch}`, OUTBOUND_RULE_BRANCH)
    .orderBy([
      { column: `audit.${PAYMENT_RECEIPT_AUDIT_DEF.columns.paymentReceiptId}`, order: "asc" },
      { column: `audit.${PAYMENT_RECEIPT_AUDIT_DEF.columns.createdAt}`, order: "desc" },
      { column: `audit.${PAYMENT_RECEIPT_AUDIT_DEF.columns.id}`, order: "desc" },
    ]);

  const auditMap = new Map();
  for (const row of auditRows || []) {
    const paymentReceiptId = Number(row.paymentReceiptId) || 0;
    if (!paymentReceiptId || auditMap.has(paymentReceiptId)) continue;
    const delta = row.delta && typeof row.delta === "object" ? row.delta : {};
    auditMap.set(paymentReceiptId, {
      outboundAmount: Number(delta.outbound_amount) || Math.abs(Number(delta.bank_balance_delta) || 0),
      outboundReason: String(delta.outbound_reason || "").trim(),
      outboundReasonLabel: String(delta.outbound_reason_label || "").trim(),
      outboundContent: String(delta.content || "").trim(),
    });
  }
  return auditMap;
 };

const listPaymentReceipts = async (req, res) => {
  const limitParam = Number.parseInt(req.query.limit, 10);
  const offsetParam = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 500)
    : 200;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;
  const missingOrderOnly =
    String(req.query.missingOrderCode ?? req.query.emptyOrderCode ?? "").trim() === "1";

  try {
    let query = db({ pr: TABLES.paymentReceipt })
      .leftJoin(
        { ft: TABLES.receiptFlowTypes },
        `ft.${FLOW_TYPE_COLS.ID}`,
        `pr.flow_type_id`
      );
    if (missingOrderOnly) {
      const orderCol = PAYMENT_RECEIPT_DEF.columns.orderCode;
      query = query.whereRaw(`COALESCE(TRIM(pr.${orderCol}::text), '') = ''`);
    }
    const rows = await query
      .select({
        id: `pr.${PAYMENT_RECEIPT_DEF.columns.id}`,
        orderCode: `pr.${PAYMENT_RECEIPT_DEF.columns.orderCode}`,
        paidAt: `pr.${PAYMENT_RECEIPT_DEF.columns.paidDate}`,
        amount: `pr.${PAYMENT_RECEIPT_DEF.columns.amount}`,
        sender: `pr.${PAYMENT_RECEIPT_DEF.columns.sender}`,
        receiver: `pr.${PAYMENT_RECEIPT_DEF.columns.receiver}`,
        note: `pr.${PAYMENT_RECEIPT_DEF.columns.note}`,
        isFinancialPosted: `pr.is_financial_posted`,
        postedRevenue: `pr.posted_revenue`,
        postedProfit: `pr.posted_profit`,
        postedOffFlowBankReceipt: `pr.posted_off_flow_bank_receipt`,
        reconciledAt: `pr.reconciled_at`,
        adjustmentApplied: `pr.adjustment_applied`,
        flowTypeId: `pr.flow_type_id`,
        flowClassifiedAt: `pr.flow_classified_at`,
        flowNote: `pr.flow_note`,
        flowTypeLabel: `ft.${FLOW_TYPE_COLS.LABEL}`,
        flowTypeCode: `ft.${FLOW_TYPE_COLS.CODE}`,
        originalOrderCode: `pr.original_order_code`,
      })
      .orderBy([
        { column: `pr.${PAYMENT_RECEIPT_DEF.columns.paidDate}`, order: "desc" },
        { column: `pr.${PAYMENT_RECEIPT_DEF.columns.id}`, order: "desc" },
      ])
      .offset(offset)
      .limit(limit);

    const normalizedRows = (rows || []).filter(Boolean);
    const outboundAuditMap = await loadOutboundAuditMap(normalizedRows.map((row) => row.id));
    const receipts = normalizedRows.map((row) => ({
      id: row.id,
      orderCode: row.orderCode,
      paidAt: row.paidAt,
      amount: Number(row.amount) || 0,
      sender: row.sender,
      receiver: row.receiver,
      note: row.note,
      isFinancialPosted: !!row.isFinancialPosted,
      postedRevenue: Number(row.postedRevenue) || 0,
      postedProfit: Number(row.postedProfit) || 0,
      postedOffFlowBankReceipt: Number(row.postedOffFlowBankReceipt) || 0,
      reconciledAt: row.reconciledAt || null,
      adjustmentApplied: !!row.adjustmentApplied,
      flowTypeId: row.flowTypeId ? Number(row.flowTypeId) : null,
      flowClassifiedAt: row.flowClassifiedAt || null,
      flowNote: row.flowNote || "",
      flowTypeLabel: row.flowTypeLabel || null,
      flowTypeCode: row.flowTypeCode || null,
      originalOrderCode: row.originalOrderCode || null,
      ...(outboundAuditMap.get(Number(row.id)) || {}),
    }));

    res.json({ receipts, count: receipts.length, offset, limit });
  } catch (error) {
    logger.error("[payments] Query failed (payment-receipts)", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải biên lai thanh toán." });
  }
};

module.exports = { listPaymentReceipts };
