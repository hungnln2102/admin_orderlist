const express = require("express");
const {
  ORDER_COLS,
  ORDER_TABLE,
  PAYMENT_RECEIPT_TABLE,
  PAYMENT_RECEIPT_COLS,
  pool,
  SUPPLIER_TABLE,
  SUPPLIER_COLS,
} = require("../config");
const { safeStringify, normalizeAmount, extractOrderCodes, resolveOrderByPayment, parseFlexibleDate, normalizeMoney } = require("../utils");
const {
  normalizeTransactionPayload,
  deriveOrderCode,
} = require("../transactions");
const {
  resolveSepaySignature,
  verifySepaySignature,
  isValidApiKey,
} = require("../auth");
const {
  insertPaymentReceipt,
  getReceiptFinancialState,
  updateReceiptFinancialState,
  insertFinancialAuditLog,
  ensureSupplyAndPriceFromOrder,
  updatePaymentSupplyBalance,
  countPaymentReceiptsForOrderCode,
} = require("../payments");
const {
  queueRenewalTask,
  processRenewalTask,
  fetchOrderState,
  isEligibleForRenewal,
} = require("../renewal");
const { STATUS: ORDER_STATUS } = require("../../../src/utils/statuses");
const {
  isMavnImportOrder,
  isMavrykShopSupplierName,
} = require("../../../src/utils/orderHelpers");
const {
  resolveDashboardImportDeltaOnPaid,
} = require("../../../src/controllers/Order/finance/dashboardImportDeltaOnPaid");
const { getOrderQrPaymentEligibility } = require("../orderPaymentEligibility");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, SCHEMA_RECEIPT, RECEIPT_SCHEMA, tableName } = require("../../../src/config/dbSchema");
const {
  qualifiedSummaryCol,
  recomputeSummaryMonthTotalTax,
  monthKeyFromPaidDateYmd,
} = require("../../../src/controllers/Order/finance/dashboardSummary");
const logger = require("../../../src/utils/logger");
const { computeOrderCurrentPrice } = require("../renewalPricing");
const { withSavepoint } = require("../savepoint");
const UNDERPAY_TOLERANCE_VND = 5000;
const PAYMENT_RECEIPT_BASE_TABLE = PAYMENT_RECEIPT_TABLE.split(".").pop();
const PAYMENT_RECEIPT_TABLE_RESOLVED = tableName(PAYMENT_RECEIPT_BASE_TABLE, SCHEMA_RECEIPT);
const REFUND_CREDIT_APPLICATIONS_TABLE = tableName(
  RECEIPT_SCHEMA.REFUND_CREDIT_APPLICATIONS.TABLE,
  SCHEMA_RECEIPT
);
const PAYMENT_RECEIPT_BATCH_TABLE = tableName(
  RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH.TABLE,
  SCHEMA_RECEIPT
);
const PAYMENT_RECEIPT_BATCH_ITEM_TABLE = tableName(
  RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH_ITEM.TABLE,
  SCHEMA_RECEIPT
);
const BATCH_CODE_REGEX = /\bMAVG[A-Z0-9]{4,20}\b/gi;
const isBatchCode = (value) => /^MAVG[A-Z0-9]{4,20}$/i.test(String(value || "").trim());
const hasMissingTableError = (error, tableName) =>
  error?.code === "42P01" &&
  String(error?.message || "").toLowerCase().includes(String(tableName || "").toLowerCase());
const isMissingBatchTablesError = (error) =>
  hasMissingTableError(error, "payment_receipt_batch") ||
  hasMissingTableError(error, "payment_receipt_batch_item");

const extractBatchCodes = (transaction) => {
  const fields = [
    transaction?.code,
    transaction?.transaction_content,
    transaction?.note,
    transaction?.description,
  ];
  const out = new Set();
  for (const field of fields) {
    const matches = String(field || "").toUpperCase().match(BATCH_CODE_REGEX) || [];
    for (const code of matches) {
      const normalized = String(code || "").trim().toUpperCase();
      if (normalized) out.add(normalized);
    }
  }
  return [...out];
};

const resolveOrderCodesByBatchCodes = async (client, batchCodes) => {
  const normalized = [...new Set((batchCodes || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean))];
  if (normalized.length === 0) return new Map();
  const sql = `
    SELECT
      UPPER(COALESCE(i.batch_code::text, '')) AS batch_code,
      UPPER(COALESCE(i.order_code::text, '')) AS order_code
    FROM ${PAYMENT_RECEIPT_BATCH_ITEM_TABLE} i
    INNER JOIN ${PAYMENT_RECEIPT_BATCH_TABLE} b
      ON b.id = i.batch_id
    WHERE UPPER(COALESCE(i.batch_code::text, '')) = ANY($1::text[])
      AND TRIM(COALESCE(i.order_code::text, '')) <> ''
      AND LOWER(COALESCE(b.status::text, 'pending')) <> 'cancelled'
    ORDER BY i.id ASC
  `;
  let rows = [];
  try {
    const result = await client.query(sql, [normalized]);
    rows = result.rows || [];
  } catch (error) {
    if (isMissingBatchTablesError(error)) {
      logger.warn("[Webhook] Skip batch-code expansion: batch tables missing");
      return new Map();
    }
    throw error;
  }
  const map = new Map();
  for (const row of rows) {
    const batch = String(row?.batch_code || "").trim().toUpperCase();
    const orderCode = String(row?.order_code || "").trim().toUpperCase();
    if (!batch || !orderCode) continue;
    const list = map.get(batch) || [];
    if (!list.includes(orderCode)) list.push(orderCode);
    map.set(batch, list);
  }
  return map;
};

/** Tên NCC theo supply_id (chuẩn hóa lowercase trong isMavrykShopSupplierName). */
const fetchSupplierNameBySupplyId = async (client, supplyIdRaw) => {
  if (supplyIdRaw == null || !Number.isFinite(Number(supplyIdRaw))) return "";
  try {
    return await withSavepoint(client, "fetch_supplier_nm", async () => {
      const { rows } = await client.query(
        `SELECT ${SUPPLIER_COLS.supplierName} FROM ${SUPPLIER_TABLE}
       WHERE ${SUPPLIER_COLS.id} = $1 LIMIT 1`,
        [Number(supplyIdRaw)]
      );
      return String(rows[0]?.[SUPPLIER_COLS.supplierName] ?? "").trim();
    });
  } catch (e) {
    logger.warn("[Webhook] Không đọc được tên NCC", {
      supplyIdRaw,
      error: e.message,
    });
    return "";
  }
};

const router = express.Router();
const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const toMonthKey = (value) => {
  const parsedDate = parseFlexibleDate(value);
  if (!parsedDate) return null;
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const incrementDashboardSummaryByDelta = async (
  client,
  monthKey,
  { revenueDelta = 0, profitDelta = 0, ordersDelta = 0, importDelta = 0, offFlowDelta = 0 } = {}
) => {
  const revenue = normalizeMoney(revenueDelta);
  const profit = normalizeMoney(profitDelta);
  const orders = Number.isFinite(Number(ordersDelta)) ? Number(ordersDelta) : 0;
  const imp = normalizeMoney(importDelta);
  const offFlow = normalizeMoney(offFlowDelta);
  if (!monthKey) return;
  if (!revenue && !profit && !orders && !imp && !offFlow) return;

  await client.query(
    `
      INSERT INTO ${summaryTable} (
        ${summaryCols.MONTH_KEY},
        ${summaryCols.TOTAL_ORDERS},
        ${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT},
        ${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT},
        ${summaryCols.UPDATED_AT}
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (${summaryCols.MONTH_KEY})
      DO UPDATE SET
        ${summaryCols.TOTAL_ORDERS} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_ORDERS)} + EXCLUDED.${summaryCols.TOTAL_ORDERS}),
        ${summaryCols.TOTAL_REVENUE} = ${qualifiedSummaryCol(summaryCols.TOTAL_REVENUE)} + EXCLUDED.${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT} = ${qualifiedSummaryCol(summaryCols.TOTAL_PROFIT)} + EXCLUDED.${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_IMPORT)} + EXCLUDED.${summaryCols.TOTAL_IMPORT}),
        ${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT} = ${qualifiedSummaryCol(summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT)} + EXCLUDED.${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT},
        ${summaryCols.UPDATED_AT} = NOW()
    `,
    [monthKey, orders, revenue, profit, imp, offFlow]
  );
  await recomputeSummaryMonthTotalTax(client, monthKey);
};

/**
 * `importDelta`: xem `resolveDashboardImportDeltaOnPaid` — chỉ khi **không** có dòng log
 * NCC trong **đúng tháng** `paidMonthKey` (log tháng trước + gia hạn tháng này vẫn bù được).
 */

const postWebhookPaymentForOrder = async (
  client,
  {
    code,
    state,
    receiptId,
    paidMonthKey,
    revenueAmount,
    ordersDelta = 0,
    ruleBranch,
    amountDecision = null,
    /**
     * - `transition_to_paid`: DT/LN += tiền lần này; LN −= cost; `total_import` += cost trên app
     *   chỉ khi **không có** dòng log NCC trong **tháng** `paidMonthKey` (có trong tháng đó → ledger).
     * - `revenue_equals_profit`: một bước DT/LN += tiền (không chỉnh cost).
     */
    profitPostingMode = "transition_to_paid",
  }
) => {
  const wire = normalizeMoney(revenueAmount);
  if (!wire || !state) return { revenue: 0, profit: 0 };

  const cost = normalizeMoney(state[ORDER_COLS.cost]);
  const impliedMargin = normalizeMoney(wire - cost);
  let netProfitForLedger = 0;
  let importDeltaForAudit = 0;

  if (profitPostingMode === "revenue_equals_profit") {
    netProfitForLedger = wire;
    await incrementDashboardSummaryByDelta(client, paidMonthKey, {
      revenueDelta: wire,
      profitDelta: wire,
      ordersDelta,
    });
  } else {
    await incrementDashboardSummaryByDelta(client, paidMonthKey, {
      revenueDelta: wire,
      profitDelta: wire,
      ordersDelta,
    });
    if (cost > 0) {
      importDeltaForAudit = await resolveDashboardImportDeltaOnPaid(
        client,
        state,
        cost,
        fetchSupplierNameBySupplyId,
        paidMonthKey
      );
      await incrementDashboardSummaryByDelta(client, paidMonthKey, {
        profitDelta: -cost,
        importDelta: importDeltaForAudit,
      });
    }
    netProfitForLedger = impliedMargin;
  }

  if (receiptId) {
    await insertFinancialAuditLog(client, {
      payment_receipt_id: receiptId,
      order_code: code,
      rule_branch: ruleBranch,
      delta: {
        posted_revenue: wire,
        posted_profit: netProfitForLedger,
        profit_provisional_wire: profitPostingMode === "transition_to_paid" ? wire : undefined,
        profit_deduct_cost_on_paid: profitPostingMode === "transition_to_paid" && cost > 0 ? cost : undefined,
        total_import_add_on_paid:
          profitPostingMode === "transition_to_paid" && importDeltaForAudit > 0
            ? importDeltaForAudit
            : undefined,
        total_import_via_supplier_cost_log_recalc:
          profitPostingMode === "transition_to_paid" && cost > 0 && importDeltaForAudit === 0
            ? true
            : undefined,
        implied_margin_vnd: impliedMargin,
        month_key: paidMonthKey,
        received_current: amountDecision?.receivedCurrent ?? wire,
        received_accumulated: amountDecision?.receivedAccumulated ?? wire,
        credit_applied_amount:
          amountDecision?.creditedAmount ?? normalizeMoney(state.credit_applied_amount),
        effective_received_current:
          amountDecision?.effectiveReceivedCurrent ??
          normalizeMoney(wire + normalizeMoney(state.credit_applied_amount)),
        effective_received_accumulated:
          amountDecision?.effectiveReceivedAccumulated ??
          normalizeMoney(wire + normalizeMoney(state.credit_applied_amount)),
        order_price_at_webhook:
          amountDecision?.orderPriceAtWebhook ?? normalizeMoney(state[ORDER_COLS.price]),
        required_min:
          amountDecision?.requiredMin ??
          Math.max(0, normalizeMoney(state[ORDER_COLS.price]) - UNDERPAY_TOLERANCE_VND),
        shortfall_amount: amountDecision?.shortfallAmount ?? 0,
        webhook_amount_flow: amountDecision?.webhookAmountFlow ?? "WEBHOOK_AMOUNT",
      },
      source: "webhook",
    });
  }

  return { revenue: wire, profit: netProfitForLedger };
};

const computeWebhookAmountDecision = ({
  orderPrice,
  currentAmount,
  accumulatedAmount,
  creditAppliedAmount,
}) => {
  const normalizedPrice = normalizeMoney(orderPrice);
  const receivedCurrent = normalizeMoney(currentAmount);
  const receivedAccumulated = normalizeMoney(accumulatedAmount);
  const creditedAmount = Math.max(0, normalizeMoney(creditAppliedAmount));
  const effectiveReceivedCurrent = normalizeMoney(receivedCurrent + creditedAmount);
  const effectiveReceivedAccumulated = normalizeMoney(receivedAccumulated + creditedAmount);
  const requiredMin = Math.max(0, normalizedPrice - UNDERPAY_TOLERANCE_VND);
  const shortfallAmount = Math.max(0, requiredMin - effectiveReceivedAccumulated);
  const meetsCurrent = effectiveReceivedCurrent >= requiredMin;
  const meetsAccumulated = effectiveReceivedAccumulated >= requiredMin;
  const overpaidCurrent = receivedCurrent > normalizedPrice;

  if (meetsCurrent) {
    return {
      complete: true,
      waitTopup: false,
      useAccumulated: false,
      branch: overpaidCurrent ? "OVERPAID_COMPLETE" : "WITHIN_5K_COMPLETE",
      orderPriceAtWebhook: normalizedPrice,
      requiredMin,
      receivedCurrent,
      receivedAccumulated,
      creditedAmount,
      effectiveReceivedCurrent,
      effectiveReceivedAccumulated,
      shortfallAmount,
      webhookAmountFlow: overpaidCurrent ? "OVERPAID" : "WITHIN_5K",
      postedAmount: receivedCurrent,
    };
  }

  if (meetsAccumulated) {
    return {
      complete: true,
      waitTopup: false,
      useAccumulated: true,
      branch: "ACCUMULATED_COMPLETE",
      orderPriceAtWebhook: normalizedPrice,
      requiredMin,
      receivedCurrent,
      receivedAccumulated,
      creditedAmount,
      effectiveReceivedCurrent,
      effectiveReceivedAccumulated,
      shortfallAmount: 0,
      webhookAmountFlow: "ACCUMULATED",
      postedAmount: receivedAccumulated,
    };
  }

  return {
    complete: false,
    waitTopup: true,
    useAccumulated: false,
    branch: "UNDER_5K_WAIT_TOPUP",
    orderPriceAtWebhook: normalizedPrice,
    requiredMin,
    receivedCurrent,
    receivedAccumulated,
    creditedAmount,
    effectiveReceivedCurrent,
    effectiveReceivedAccumulated,
    shortfallAmount,
    webhookAmountFlow: "AWAITING_TOPUP",
    postedAmount: 0,
  };
};

const resolveOrderPriceForWebhookMatch = async (client, orderCode, state, statusValue) => {
  const stored = normalizeMoney(state?.[ORDER_COLS.price]);
  if (statusValue !== ORDER_STATUS.RENEWAL || !state) {
    return stored;
  }
  const row = {
    ...state,
    [ORDER_COLS.idOrder]: state[ORDER_COLS.idOrder] ?? orderCode,
  };
  try {
    const { price } = await computeOrderCurrentPrice(client, row);
    const current = normalizeMoney(price);
    if (current > 0 && current !== stored) {
      logger.info("[Webhook] Gia hạn: so khớp CK theo giá bảng hiện tại (không snapshot đơn)", {
        orderCode,
        storedPrice: stored,
        currentPrice: current,
      });
    }
    if (current > 0) {
      return current;
    }
  } catch (e) {
    logger.warn("[Webhook] Không tính được giá hiện tại khi gia hạn, dùng giá trên đơn", {
      orderCode,
      error: e?.message,
    });
  }
  return stored;
};

const getAccumulatedReceiptAmount = async (client, orderCode, orderDateRaw) => {
  const normalizedCode = String(orderCode || "").trim();
  if (!normalizedCode) return 0;
  const parsedOrderDate = parseFlexibleDate(orderDateRaw);
  const fromDate = parsedOrderDate
    ? parsedOrderDate.toISOString().slice(0, 10)
    : "1900-01-01";

  const res = await client.query(
    `
      SELECT COALESCE(SUM(pr.${PAYMENT_RECEIPT_COLS.amount})::numeric, 0) AS accumulated_amount
      FROM ${PAYMENT_RECEIPT_TABLE_RESOLVED} pr
      WHERE LOWER(COALESCE(pr.${PAYMENT_RECEIPT_COLS.orderCode}::text, '')) = LOWER($1)
        AND pr.${PAYMENT_RECEIPT_COLS.paidDate} >= $2::date
    `,
    [normalizedCode, fromDate]
  );
  return normalizeMoney(res.rows?.[0]?.accumulated_amount);
};

const isSupplierSettlementTransfer = (transaction) => {
  const content = String(transaction?.transaction_content || "").trim();
  if (!content) return false;
  return /^TT\s+.+\s+k[ỳy]\s+\d{8}$/i.test(content);
};

// Health check for webhook endpoint
router.get("/", (_req, res) => {
  res.json({ message: "Sepay webhook endpoint. Use POST with signature." });
});

router.post("/", async (req, res) => {
  logger.debug("Incoming Sepay webhook", {
    headers: {
      authorization: req.get("Authorization") ? "***" : null,
      xApiKey: req.get("X-API-KEY") ? "***" : null,
      xSepaySignature: req.get("X-SEPAY-SIGNATURE") ? "***" : null,
      signature: req.get("Signature") ? "***" : null,
      querySignature: req.query?.signature ? "***" : null,
    },
    bodySize: JSON.stringify(req.body).length,
  });

  const signature = resolveSepaySignature(req);
  const hasValidSignature = verifySepaySignature(req.rawBody, signature);
  const hasValidApiKey = isValidApiKey(req);
  if (!(hasValidSignature || hasValidApiKey)) {
    logger.warn("Webhook auth failed", {
      hasValidSignature,
      hasValidApiKey,
      hasAuth: !!req.get("Authorization"),
    });
    return res.status(403).json({ message: "Invalid Signature" });
  }

  const transaction = normalizeTransactionPayload(req.body);
  logger.debug("Parsed transaction", { transaction: safeStringify(transaction) });
  if (!transaction) {
    return res.status(400).json({ message: "Missing transaction" });
  }

  const orderCode = deriveOrderCode(transaction);
  const extractedOrderCodes = extractOrderCodes(transaction);
  const explicitBatchCodes = extractBatchCodes(transaction);
  const normalizedPrimary = String(orderCode || "").trim().toUpperCase();
  const normalizedExtracted = extractedOrderCodes
    .map((code) => String(code || "").trim().toUpperCase())
    .filter(Boolean);
  // Nhiều mã đơn phân cách bằng "-": dùng đủ danh sách đã tách, không chỉ primary
  const orderCodes = [
    ...new Set(
      normalizedExtracted.length > 0
        ? normalizedExtracted
        : normalizedPrimary
          ? [normalizedPrimary]
          : []
    ),
  ];
  const batchCodes = [
    ...new Set([
      ...explicitBatchCodes,
      ...orderCodes.filter((code) => isBatchCode(code)),
    ]),
  ];
  logger.debug("Order codes from webhook", { orderCodes, count: orderCodes.length });
  const transferAmountNormalized = normalizeAmount(
    transaction.transfer_amount || transaction.amount_in
  );
  const supplierSettlementTransfer = isSupplierSettlementTransfer(transaction);

  try {
    let receiptResult = null;
    const eligibilityByOrderCode = new Map();
    const stateByOrderCode = new Map();
    const amountDecisionByOrderCode = new Map();
    let loopOrderCodes = [];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const transitionedOrderCodesToPaid = new Set();
      if (!orderCodes.length && transferAmountNormalized > 0 && !supplierSettlementTransfer) {
        logger.info("[Webhook] No MAV order code found, trying amount-based fallback", {
          amount: transferAmountNormalized,
          content: transaction.transaction_content,
        });
        const fallbackCodes = await resolveOrderByPayment(client, {
          amount: transferAmountNormalized,
          transactionContent: transaction.transaction_content,
        });
        if (fallbackCodes.length) {
          orderCodes.push(...fallbackCodes);
          logger.info("[Webhook] Fallback matched orders", { orderCodes: fallbackCodes });
        } else {
          logger.warn("[Webhook] Fallback không tìm thấy đơn hàng phù hợp", {
            amount: transferAmountNormalized,
          });
        }
      } else if (!orderCodes.length && supplierSettlementTransfer) {
        logger.info("[Webhook] Skip amount-based fallback for supplier settlement transfer", {
          amount: transferAmountNormalized,
          content: transaction.transaction_content,
        });
      }

      const batchOrderMap = await resolveOrderCodesByBatchCodes(client, batchCodes);
      const expandedOrderCodes = [
        ...new Set([
          ...orderCodes.filter((code) => !isBatchCode(code)),
          ...[...batchOrderMap.values()].flat(),
        ]),
      ];
      loopOrderCodes = expandedOrderCodes.length
        ? expandedOrderCodes
        : orderCode && !isBatchCode(orderCode)
          ? [orderCode]
          : [];

      if (batchCodes.length > 0) {
        logger.info("[Webhook] Resolve MAVG batch codes", {
          batchCodes,
          expandedOrderCodes: loopOrderCodes,
        });
      }

      for (const code of loopOrderCodes) {
        const stateRes = await client.query(
          `SELECT
            ${ORDER_COLS.id},
            ${ORDER_COLS.idOrder},
            ${ORDER_COLS.idProduct},
            ${ORDER_COLS.status},
            ${ORDER_COLS.expiryDate},
            ${ORDER_COLS.orderDate},
            ${ORDER_COLS.price},
            ${ORDER_COLS.cost},
            ${ORDER_COLS.idSupply},
            (
              SELECT COALESCE(SUM(rca.applied_amount)::numeric, 0)
              FROM ${REFUND_CREDIT_APPLICATIONS_TABLE} rca
              WHERE LOWER(COALESCE(rca.target_order_code::text, '')) = LOWER(${ORDER_TABLE}.${ORDER_COLS.idOrder}::text)
            ) AS credit_applied_amount
          FROM ${ORDER_TABLE}
          WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
          LIMIT 1`,
          [code]
        );
        const state = stateRes.rows[0] || null;
        stateByOrderCode.set(code, state);
        eligibilityByOrderCode.set(
          code,
          state
            ? isEligibleForRenewal(
                state[ORDER_COLS.status],
                state[ORDER_COLS.expiryDate]
              )
            : null
        );
      }

      // Dùng mã đơn đã resolve (fallback hoặc extract) thay vì orderCode gốc
      const resolvedOrderCode = batchCodes[0] || loopOrderCodes[0] || orderCode;
      receiptResult = await insertPaymentReceipt(transaction, { client, orderCode: resolvedOrderCode });
      const receiptId = receiptResult?.id ?? receiptResult?.existingId ?? null;
      const receiptState = await getReceiptFinancialState(client, receiptId);
      const alreadyFinancialPosted = !!receiptState?.is_financial_posted;
      // Ưu tiên YYYY-MM-DD từ biên lai (khớp INSERT) để cùng tháng với `payment_receipt.paid_date`.
      const paidMonthKey =
        monthKeyFromPaidDateYmd(receiptResult?.paidDate) ||
        toMonthKey(transaction.transaction_date || transaction.transaction_date_raw || new Date());
      let postedRevenueDelta = 0;
      let postedProfitDelta = 0;
      let postedOffFlowBankReceiptDelta = 0;

      if (receiptId && alreadyFinancialPosted) {
        await insertFinancialAuditLog(client, {
          payment_receipt_id: receiptId,
          order_code: String(resolvedOrderCode || "").trim(),
          rule_branch: "SKIP_DUPLICATE_OR_ALREADY_POSTED",
          delta: {
            duplicate: !!receiptResult?.duplicate,
            inserted: !!receiptResult?.inserted,
            is_financial_posted: true,
          },
          source: "webhook",
        });
      }

      // Chưa Thanh Toán → Đã Thanh Toán khi có biên lai (trigger có thể ghi log chi phí NCC; TT NCC trên log mặc định Chưa Thanh Toán).
      // MAVN: không đổi trạng thái đơn qua Sepay — Đã Thanh Toán khi xác nhận thanh toán NCC (POST .../payment-supply/.../confirm).
      // Cần Gia Hạn: renewal sau COMMIT (+ log khi cập nhật đơn trong renewal.js).
      if (!alreadyFinancialPosted && (receiptResult?.inserted || receiptResult?.duplicate)) {
        const codesToUpdate = loopOrderCodes;
        for (const code of codesToUpdate) {
          if (isMavnImportOrder({ id_order: code })) {
            logger.info("[Webhook] Skip status update for MAVN (nhập hàng)", {
              orderCode: code,
            });
            continue;
          }

          const state = stateByOrderCode.get(code);
          if (!state) continue;

          const statusValue = state[ORDER_COLS.status];

          // Đơn đã Đã Thanh Toán + biên lai mới: tiền vào NH không ghi DT/LN (ngoài luồng kế toán).
          if (
            receiptResult?.inserted &&
            transferAmountNormalized > 0 &&
            statusValue === ORDER_STATUS.PAID
          ) {
            const extraVnd = normalizeMoney(transferAmountNormalized);
            await incrementDashboardSummaryByDelta(client, paidMonthKey, {
              offFlowDelta: extraVnd,
              ordersDelta: 0,
            });
            postedOffFlowBankReceiptDelta += extraVnd;
            if (receiptId) {
              await insertFinancialAuditLog(client, {
                payment_receipt_id: receiptId,
                order_code: code,
                rule_branch: "POST_PAID_ADDITIONAL_OFF_FLOW_BANK_RECEIPT",
                delta: {
                  posted_off_flow_bank_receipt: extraVnd,
                  month_key: paidMonthKey,
                },
                source: "webhook",
              });
            }
            logger.debug("[Webhook] Ghi nhận tiền NH ngoài luồng DT/LN (biên thêm sau Đã TT)", {
              orderCode: code,
              status: statusValue,
              amount: extraVnd,
            });
            continue;
          }

          const qrEligibility = getOrderQrPaymentEligibility(statusValue);
          if (!qrEligibility.canPayByQr && statusValue !== ORDER_STATUS.PROCESSING) {
            logger.info("[Webhook] Skip QR payment posting for locked order", {
              orderCode: code,
              status: statusValue,
              reason: qrEligibility.reason,
            });
            if (receiptId) {
              await insertFinancialAuditLog(client, {
                payment_receipt_id: receiptId,
                order_code: code,
                rule_branch: qrEligibility.auditBranch,
                delta: {
                  order_status: statusValue,
                  reason: qrEligibility.reason,
                },
                source: "webhook",
              });
            }
            continue;
          }

          let amountDecision = amountDecisionByOrderCode.get(code) || null;
          if (
            !amountDecision &&
            (
              statusValue === ORDER_STATUS.UNPAID ||
              statusValue === ORDER_STATUS.RENEWAL ||
              statusValue === ORDER_STATUS.PROCESSING
            )
          ) {
            const accumulatedAmount = await getAccumulatedReceiptAmount(
              client,
              code,
              state[ORDER_COLS.orderDate]
            );
            const orderPriceForWebhook = await resolveOrderPriceForWebhookMatch(
              client,
              code,
              state,
              statusValue
            );
            amountDecision = computeWebhookAmountDecision({
              orderPrice: orderPriceForWebhook,
              currentAmount: transferAmountNormalized,
              accumulatedAmount,
              creditAppliedAmount: state.credit_applied_amount,
            });
            amountDecisionByOrderCode.set(code, amountDecision);
          }

          const renewalEligibility = eligibilityByOrderCode.get(code);
          // RENEWAL + đủ tiền + trong cửa sổ gia hạn: renewal.js (sau COMMIT) mới ghi dashboard / đổi trạng thái.
          if (
            statusValue === ORDER_STATUS.RENEWAL &&
            renewalEligibility?.eligible &&
            amountDecision?.complete
          ) {
            continue;
          }

          if (
            statusValue === ORDER_STATUS.UNPAID ||
            statusValue === ORDER_STATUS.PROCESSING ||
            statusValue === ORDER_STATUS.RENEWAL
          ) {
            if (amountDecision && !amountDecision.complete) {
              const part = normalizeMoney(amountDecision.receivedCurrent);
              if (part > 0) {
                await incrementDashboardSummaryByDelta(client, paidMonthKey, {
                  revenueDelta: part,
                  profitDelta: part,
                  ordersDelta: 0,
                });
                postedRevenueDelta += part;
                postedProfitDelta += part;
              }
              if (receiptId) {
                await insertFinancialAuditLog(client, {
                  payment_receipt_id: receiptId,
                  order_code: code,
                  rule_branch: amountDecision.branch,
                  delta: {
                    received_current: amountDecision.receivedCurrent,
                    received_accumulated: amountDecision.receivedAccumulated,
                    credit_applied_amount: amountDecision.creditedAmount,
                    effective_received_current: amountDecision.effectiveReceivedCurrent,
                    effective_received_accumulated: amountDecision.effectiveReceivedAccumulated,
                    order_price_at_webhook: amountDecision.orderPriceAtWebhook,
                    required_min: amountDecision.requiredMin,
                    shortfall_amount: amountDecision.shortfallAmount,
                    webhook_amount_flow: amountDecision.webhookAmountFlow,
                    ...(part > 0
                      ? {
                          posted_revenue: part,
                          posted_profit: part,
                          installment_note:
                            "Chưa đủ thu — DT/LN += tiền lần này (chưa trừ cost đơn).",
                        }
                      : {}),
                  },
                  source: "webhook",
                });
              }
              continue;
            }
            const nextStatus = ORDER_STATUS.PAID;
            const statusUpdateResult = await client.query(
              `UPDATE ${ORDER_TABLE}
               SET ${ORDER_COLS.status} = $2
               WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
                 AND ${ORDER_COLS.status} = $3`,
              [code, nextStatus, statusValue]
            );
            if (statusUpdateResult.rowCount > 0) {
              const wireNow =
                normalizeMoney(amountDecision?.receivedCurrent) || transferAmountNormalized;
              const { revenue: rev, profit: prof } = await postWebhookPaymentForOrder(client, {
                code,
                state,
                receiptId,
                paidMonthKey,
                revenueAmount: wireNow,
                ordersDelta: 1,
                ruleBranch:
                  statusValue === ORDER_STATUS.PROCESSING
                    ? "PROCESSING_TO_PAID_WEBHOOK_POST"
                    : statusValue === ORDER_STATUS.RENEWAL
                      ? amountDecision?.branch || "RENEWAL_TO_PAID_WEBHOOK_POST"
                      : amountDecision?.branch || "WITHIN_5K_COMPLETE",
                amountDecision,
                profitPostingMode: "transition_to_paid",
              });
              postedRevenueDelta += rev;
              postedProfitDelta += prof;
              transitionedOrderCodesToPaid.add(code);
            }
            logger.debug("[Webhook] Order status → Đã Thanh Toán", {
              orderCode: code,
              previousStatus: statusValue,
              nextStatus,
            });
          }
        }
      }

      if (
        !alreadyFinancialPosted &&
        (!loopOrderCodes.length && !orderCode) &&
        transferAmountNormalized > 0 &&
        !supplierSettlementTransfer
      ) {
        await incrementDashboardSummaryByDelta(client, paidMonthKey, {
          offFlowDelta: transferAmountNormalized,
          ordersDelta: 0,
        });
        postedOffFlowBankReceiptDelta += transferAmountNormalized;
        if (receiptId) {
          await insertFinancialAuditLog(client, {
            payment_receipt_id: receiptId,
            order_code: "",
            rule_branch: "NO_ORDER_CODE_OFF_FLOW_BANK_RECEIPT",
            delta: {
              posted_off_flow_bank_receipt: transferAmountNormalized,
              month_key: paidMonthKey,
            },
            source: "webhook",
          });
        }
      }
      if (
        !alreadyFinancialPosted &&
        (!loopOrderCodes.length && !orderCode) &&
        transferAmountNormalized > 0 &&
        supplierSettlementTransfer &&
        receiptId
      ) {
        await insertFinancialAuditLog(client, {
          payment_receipt_id: receiptId,
          order_code: "",
          rule_branch: "NO_ORDER_CODE_SUPPLIER_SETTLEMENT_SKIP",
          delta: {
            posted_revenue: 0,
            posted_profit: 0,
            month_key: paidMonthKey,
            content: String(transaction.transaction_content || ""),
          },
          source: "webhook",
        });
      }

      if (receiptResult?.inserted) {
        const referenceImport =
          loopOrderCodes.length > 1 ? null : transferAmountNormalized;

        for (const code of loopOrderCodes) {
          const state = stateByOrderCode.get(code);
          const eligibility = eligibilityByOrderCode.get(code);
          const qrEligibility = getOrderQrPaymentEligibility(state?.[ORDER_COLS.status]);
          const isManualProcessingAwaitingWebhook =
            state?.[ORDER_COLS.status] === ORDER_STATUS.PROCESSING;

          if (!qrEligibility.canPayByQr && !isManualProcessingAwaitingWebhook) {
            logger.info("[Webhook] Skip supplier import for QR-locked order", {
              orderCode: code,
              status: state?.[ORDER_COLS.status],
              reason: qrEligibility.reason,
            });
            continue;
          }

          if (isMavnImportOrder({ id_order: code })) {
            logger.info("[Webhook] Skip supplier import for MAVN (nhập hàng)", {
              orderCode: code,
            });
            continue;
          }

          const loopSupplyName = await fetchSupplierNameBySupplyId(
            client,
            state?.[ORDER_COLS.idSupply]
          );
          if (isMavrykShopSupplierName(loopSupplyName)) {
            logger.info("[Webhook] Skip supplier import (NCC Mavryk/Shop)", {
              orderCode: code,
            });
            continue;
          }

          // Avoid double supplier import updates for renewal flows:
          // - Renewal path already calls updatePaymentSupplyBalance() inside runRenewal().
          // - Additional Sepay receipt after order already PAID (e.g. two transfers / simulate with different amounts):
          //   must not call updatePaymentSupplyBalance again or payment_supply / perceived import doubles.
          if (eligibility?.eligible) continue;

          const priorStatus = state?.[ORDER_COLS.status];
          if (
            priorStatus === ORDER_STATUS.PAID &&
            !transitionedOrderCodesToPaid.has(code)
          ) {
            const receiptN = await countPaymentReceiptsForOrderCode(client, code);
            if (receiptN > 1) {
              logger.info(
                "[Webhook] Skip payment_supply bump: order already PAID before this webhook; extra receipt (avoid double import)",
                { orderCode: code, receiptCount: receiptN }
              );
              continue;
            }
          }

          const ensured = await ensureSupplyAndPriceFromOrder(code, {
            referenceImport,
            client,
          });
          logger.debug("Ensure supply/price result", { orderCode: code, ensured });
          if (ensured?.supplierId && Number.isFinite(ensured.price)) {
            await updatePaymentSupplyBalance(
              ensured.supplierId,
              ensured.price,
              new Date(),
              { client }
            );
          }
        }
      }

      if (receiptId) {
        if (
          !alreadyFinancialPosted &&
          (postedRevenueDelta !== 0 ||
            postedProfitDelta !== 0 ||
            postedOffFlowBankReceiptDelta !== 0)
        ) {
          await updateReceiptFinancialState(client, receiptId, {
            is_financial_posted: true,
            posted_revenue: postedRevenueDelta,
            posted_profit: postedProfitDelta,
            posted_off_flow_bank_receipt: postedOffFlowBankReceiptDelta,
          });
        } else if (!alreadyFinancialPosted) {
          await updateReceiptFinancialState(client, receiptId, {
            is_financial_posted: false,
            posted_revenue: 0,
            posted_profit: 0,
            posted_off_flow_bank_receipt: 0,
          });
          await insertFinancialAuditLog(client, {
            payment_receipt_id: receiptId,
            order_code: String(resolvedOrderCode || "").trim(),
            rule_branch: "WEBHOOK_STATE_NOT_POSTED",
            delta: {
              posted_revenue: 0,
              posted_profit: 0,
              posted_off_flow_bank_receipt: 0,
              is_financial_posted: false,
            },
            source: "webhook",
          });
        }
      }

      if (receiptId && batchCodes.length > 0) {
        try {
          await client.query(
            `
              UPDATE ${PAYMENT_RECEIPT_BATCH_TABLE}
              SET status = 'paid',
                  paid_receipt_id = $1,
                  paid_at = COALESCE(paid_at, NOW()),
                  updated_at = NOW()
              WHERE UPPER(COALESCE(batch_code::text, '')) = ANY($2::text[])
                AND LOWER(COALESCE(status::text, 'pending')) <> 'cancelled'
            `,
            [receiptId, batchCodes]
          );
        } catch (error) {
          if (isMissingBatchTablesError(error)) {
            logger.warn("[Webhook] Skip updating batch status: batch tables missing");
          } else {
            throw error;
          }
        }
      }

      await client.query("COMMIT");

      // Gia hạn: sau COMMIT, vẫn dùng cùng client (trước release). paidMonthKey/receiptId chỉ tồn tại trong khối try này.
      try {
        for (const code of loopOrderCodes) {
          const state = stateByOrderCode.get(code);
          const statusValue = state?.[ORDER_COLS.status];
          const qrEligibility = getOrderQrPaymentEligibility(statusValue);
          if (!qrEligibility.canPayByQr) {
            logger.info("[Webhook] Skip renewal for QR-locked order", {
              orderCode: code,
              status: statusValue,
              reason: qrEligibility.reason,
            });
            continue;
          }

          let amountDecision = amountDecisionByOrderCode.get(code) || null;
          if (!amountDecision) {
            if (state && (statusValue === ORDER_STATUS.UNPAID || statusValue === ORDER_STATUS.RENEWAL)) {
              const accumulatedAmount = await getAccumulatedReceiptAmount(
                client,
                code,
                state[ORDER_COLS.orderDate]
              );
              const orderPriceForWebhook = await resolveOrderPriceForWebhookMatch(
                client,
                code,
                state,
                statusValue
              );
              amountDecision = computeWebhookAmountDecision({
                orderPrice: orderPriceForWebhook,
                currentAmount: transferAmountNormalized,
                accumulatedAmount,
                creditAppliedAmount: state.credit_applied_amount,
              });
              amountDecisionByOrderCode.set(code, amountDecision);
            }
          }
          if (amountDecision && !amountDecision.complete) {
            logger.debug("[Webhook] Skip renewal, chờ đủ tiền theo rule (chưa complete)", {
              orderCode: code,
              receivedCurrent: amountDecision.receivedCurrent,
              receivedAccumulated: amountDecision.receivedAccumulated,
              requiredMin: amountDecision.requiredMin,
            });
            continue;
          }

          if (isMavnImportOrder({ id_order: code })) {
            logger.info("[Webhook] Bỏ qua renewal Sepay cho đơn MAVN", { orderCode: code });
            continue;
          }
          const precomputedEligibility = eligibilityByOrderCode.get(code);
          if (precomputedEligibility?.eligible) {
            queueRenewalTask(code, {
              forceRenewal: precomputedEligibility.forceRenewal,
              source: "webhook",
              paymentAmount: transferAmountNormalized,
              paymentMonthKey: paidMonthKey,
              paymentReceiptId: receiptId,
            });
            await processRenewalTask(code);
          }
        }
      } catch (renewErr) {
        logger.error("Renewal flow failed", { error: renewErr.message, stack: renewErr.stack });
      }
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }

    return res.json({ message: "OK" });
  } catch (err) {
    logger.error("Error saving payment", { error: err.message, stack: err.stack });
    return res.status(500).json({ message: "Internal Error" });
  }
});

module.exports = router;
