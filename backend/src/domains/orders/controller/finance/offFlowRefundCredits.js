/**
 * Credit khả dụng gắn tiền NH ngoài luồng (`total_off_flow_bank_receipt`).
 * - Mỗi lần cộng off-flow từ biên lai → tạo phiếu credit OPEN (idempotent theo payment_receipt_id).
 * - Khi hoàn tiền credit (cashout) → trừ lại off-flow tháng gốc.
 */
const { applyDashboardDelta } = require("@/domains/payments/controller/shared/dashboardDelta");
const {
  normalizeMoney,
  CREDIT_STATUS,
  REFUND_CREDIT_NOTES_TABLE,
  REFUND_CREDIT_NOTE_COLS: R,
} = require("@/domains/orders/controller/finance/refundCredits");
const logger = require("@/utils/logger");

const CREDIT_SOURCE_KIND = {
  ORDER_REFUND: "ORDER_REFUND",
  OFF_FLOW_BANK: "OFF_FLOW_BANK",
};

const buildOffFlowCreditCode = (paymentReceiptId) => {
  const rid = Number(paymentReceiptId) > 0 ? String(Number(paymentReceiptId)) : "NA";
  return `RFO-RCP-${rid}`;
};

const buildOffFlowSourceOrderCode = ({ paymentReceiptId, orderCode }) => {
  const orderToken = String(orderCode || "").trim();
  if (orderToken) return orderToken;
  const rid = Number(paymentReceiptId) > 0 ? String(Number(paymentReceiptId)) : "NA";
  return `OFF-FLOW-RCP-${rid}`;
};

const getOffFlowCreditByReceiptId = async (executor, paymentReceiptId) => {
  const rid = Number(paymentReceiptId);
  if (!Number.isFinite(rid) || rid <= 0) return null;

  if (typeof executor === "function") {
    return executor(REFUND_CREDIT_NOTES_TABLE)
      .where({ [R.PAYMENT_RECEIPT_ID]: rid, [R.SOURCE_KIND]: CREDIT_SOURCE_KIND.OFF_FLOW_BANK })
      .first();
  }

  const { rows } = await executor.query(
    `SELECT * FROM ${REFUND_CREDIT_NOTES_TABLE}
     WHERE ${R.PAYMENT_RECEIPT_ID} = $1 AND ${R.SOURCE_KIND} = $2
     LIMIT 1`,
    [rid, CREDIT_SOURCE_KIND.OFF_FLOW_BANK]
  );
  return rows[0] || null;
};

/**
 * Tạo phiếu credit khả dụng khi ghi nhận tiền ngoài luồng (idempotent theo biên lai).
 * @param {import('knex').Knex.Transaction|{query: Function}} executor
 */
const ensureOffFlowRefundCreditNote = async (
  executor,
  {
    paymentReceiptId,
    offFlowAmount,
    monthKey,
    customerName,
    customerContact,
    sourceOrderCode,
    ruleBranch,
    note,
  }
) => {
  const amount = normalizeMoney(offFlowAmount);
  const rid = Number(paymentReceiptId);
  if (amount <= 0 || !Number.isFinite(rid) || rid <= 0) return null;

  const month = String(monthKey || "")
    .trim()
    .slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    logger.warn("[OffFlowCredit] Bỏ qua tạo credit — thiếu monthKey hợp lệ", {
      paymentReceiptId: rid,
      monthKey,
    });
    return null;
  }

  const existing = await getOffFlowCreditByReceiptId(executor, rid);
  if (existing) return existing;

  const creditCode = buildOffFlowCreditCode(rid);
  const orderCode = buildOffFlowSourceOrderCode({
    paymentReceiptId: rid,
    orderCode: sourceOrderCode,
  });
  const noteText =
    String(note || "").trim() ||
    `Credit ngoài luồng từ biên lai #${rid}${ruleBranch ? ` (${ruleBranch})` : ""}.`;

  const payload = {
    [R.CREDIT_CODE]: creditCode,
    [R.SOURCE_ORDER_LIST_ID]: null,
    [R.SOURCE_ORDER_CODE]: orderCode,
    [R.CUSTOMER_NAME]: customerName ? String(customerName).trim() : null,
    [R.CUSTOMER_CONTACT]: customerContact ? String(customerContact).trim() : null,
    [R.REFUND_AMOUNT]: amount,
    [R.AVAILABLE_AMOUNT]: amount,
    [R.STATUS]: CREDIT_STATUS.OPEN,
    [R.NOTE]: noteText,
    [R.SOURCE_KIND]: CREDIT_SOURCE_KIND.OFF_FLOW_BANK,
    [R.PAYMENT_RECEIPT_ID]: rid,
    [R.OFF_FLOW_MONTH_KEY]: month,
  };

  if (typeof executor === "function") {
    const [inserted] = await executor(REFUND_CREDIT_NOTES_TABLE).insert(payload).returning("*");
    return inserted || null;
  }

  const cols = Object.keys(payload);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const values = cols.map((c) => payload[c]);
  const { rows } = await executor.query(
    `INSERT INTO ${REFUND_CREDIT_NOTES_TABLE} (${cols.join(", ")})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );
  if (rows[0]) return rows[0];

  return getOffFlowCreditByReceiptId(executor, rid);
};

/**
 * Trừ total_off_flow_bank_receipt khi hoàn tiền credit nguồn off-flow.
 */
const applyOffFlowCreditCashout = async (trx, creditNote, cashoutAmount) => {
  const sourceKind = String(creditNote?.[R.SOURCE_KIND] || CREDIT_SOURCE_KIND.ORDER_REFUND).trim();
  if (sourceKind !== CREDIT_SOURCE_KIND.OFF_FLOW_BANK) {
    return { applied: false, reason: "not_off_flow_credit" };
  }

  const amount = normalizeMoney(cashoutAmount);
  if (amount <= 0) return { applied: false, reason: "zero_amount" };

  const monthKey = String(creditNote?.[R.OFF_FLOW_MONTH_KEY] || "")
    .trim()
    .slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    logger.warn("[OffFlowCredit] Không trừ off-flow — thiếu off_flow_month_key", {
      creditNoteId: creditNote?.[R.ID],
    });
    return { applied: false, reason: "missing_month_key" };
  }

  await applyDashboardDelta(trx, monthKey, {
    offFlowDelta: -amount,
  });

  return { applied: true, monthKey, amount };
};
/**
 * Void phiếu credit off-flow gắn biên lai khi biên lai đã reconcile (match) với mã đơn.
 * Tiền đó giờ gắn vào đơn hàng → không còn là "ngoài luồng" → credit không còn khả dụng.
 * @param {import('knex').Knex.Transaction | {query: Function}} executor
 * @param {number} paymentReceiptId
 * @param {string} [reason]
 * @returns {Promise<{voided: boolean, creditNote?: object}>}
 */
const voidOffFlowCreditByReceiptId = async (executor, paymentReceiptId, reason) => {
  const rid = Number(paymentReceiptId);
  if (!Number.isFinite(rid) || rid <= 0) return { voided: false };

  const existing = await getOffFlowCreditByReceiptId(executor, rid);
  if (!existing) return { voided: false };

  const currentStatus = String(existing[R.STATUS] || "").trim().toUpperCase();
  if (currentStatus === CREDIT_STATUS.VOID || currentStatus === CREDIT_STATUS.FULLY_APPLIED) {
    return { voided: false, creditNote: existing };
  }

  const suffix = reason
    ? String(reason).trim()
    : "Biên lai đã match mã đơn — credit ngoài luồng không còn khả dụng.";
  const prevNote = existing[R.NOTE] ? String(existing[R.NOTE]).trim() : "";
  const newNote = prevNote ? `${prevNote} — ${suffix}` : suffix;

  if (typeof executor === "function") {
    await executor(REFUND_CREDIT_NOTES_TABLE)
      .where({ [R.ID]: existing[R.ID] })
      .update({
        [R.STATUS]: CREDIT_STATUS.VOID,
        [R.AVAILABLE_AMOUNT]: 0,
        [R.NOTE]: newNote,
      });
  } else {
    await executor.query(
      `UPDATE ${REFUND_CREDIT_NOTES_TABLE}
       SET ${R.STATUS} = $1, ${R.AVAILABLE_AMOUNT} = 0, ${R.NOTE} = $2
       WHERE ${R.ID} = $3`,
      [CREDIT_STATUS.VOID, newNote, existing[R.ID]]
    );
  }

  logger.info("[OffFlowCredit] Void credit off-flow do reconcile", {
    creditNoteId: existing[R.ID],
    creditCode: existing[R.CREDIT_CODE],
    paymentReceiptId: rid,
    previousStatus: currentStatus,
    availableAmount: existing[R.AVAILABLE_AMOUNT],
  });

  return { voided: true, creditNote: { ...existing, [R.STATUS]: CREDIT_STATUS.VOID, [R.AVAILABLE_AMOUNT]: 0 } };
};

module.exports = {
  CREDIT_SOURCE_KIND,
  buildOffFlowCreditCode,
  ensureOffFlowRefundCreditNote,
  applyOffFlowCreditCashout,
  getOffFlowCreditByReceiptId,
  voidOffFlowCreditByReceiptId,
};
