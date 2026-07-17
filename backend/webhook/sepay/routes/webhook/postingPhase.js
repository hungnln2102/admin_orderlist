const {
  ORDER_COLS,
  ORDER_TABLE,
  SUPPLIER_TABLE,
  SUPPLIER_COLS,
} = require("../../config");
const { parseFlexibleDate, normalizeMoney } = require("../../utils");
const { insertFinancialAuditLog } = require("../../payments");
const { STATUS: ORDER_STATUS } = require("@/utils/statuses");
const { isMavrykShopSupplierName } = require("@/utils/orderHelpers");
const {
  resolveDashboardImportDeltaOnPaid,
} = require("@/domains/orders/controller/finance/dashboardImportDeltaOnPaid");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("@/config/dbSchema");
const {
  qualifiedSummaryCol,
  recomputeSummaryMonthTotalTax,
  monthKeyFromPaidDateYmd,
} = require("@/domains/orders/controller/finance/dashboardSummary");
const {
  notifyFinanceMonthlyDelta,
} = require("@/services/telegramFinanceDeltaNotifier");
const {
  UNDERPAY_TOLERANCE_VND,
  computeDashboardPaymentDecision,
  requiredMinForSuccessfulPayment,
} = require("@/domains/orders/controller/finance/dashboardPaymentPostingPolicy");
const logger = require("@/utils/logger");
const { computeOrderCurrentPrice } = require("../../renewalPricing");
const { withSavepoint } = require("../../savepoint");
const { ensureOffFlowRefundCreditNote } = require("@/domains/orders/controller/finance/offFlowRefundCredits");
const {
  PAYMENT_RECEIPT_TABLE_RESOLVED,
  PAYMENT_RECEIPT_COLS,
} = require("./constants");

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const toMonthKey = (value) => {
  const parsedDate = parseFlexibleDate(value);
  if (!parsedDate) return null;
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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
  } catch (error) {
    logger.warn("[Webhook] Không đọc được tên NCC", {
      supplyIdRaw,
      error: error.message,
    });
    return "";
  }
};

const incrementDashboardSummaryByDelta = async (
  client,
  monthKey,
  {
    revenueDelta = 0,
    profitDelta = 0,
    ordersDelta = 0,
    importDelta = 0,
    offFlowDelta = 0,
    bankBalanceDelta = 0,
    notify = true,
    context = "webhook.incrementDashboardSummaryByDelta",
  } = {}
) => {
  return; // Bỏ qua cập nhật dashboard
  const revenue = normalizeMoney(revenueDelta);
  const profit = normalizeMoney(profitDelta);
  const orders = Number.isFinite(Number(ordersDelta)) ? Number(ordersDelta) : 0;
  const imp = normalizeMoney(importDelta);
  const offFlow = normalizeMoney(offFlowDelta);
  const bankBalance = normalizeMoney(bankBalanceDelta);
  if (!monthKey) return;
  if (!revenue && !profit && !orders && !imp && !offFlow && !bankBalance) return;

  await client.query(
    `
      INSERT INTO ${summaryTable} (
        ${summaryCols.MONTH_KEY},
        ${summaryCols.TOTAL_ORDERS},
        ${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT},
        ${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT},
        ${summaryCols.ESTIMATED_BANK_BALANCE},
        ${summaryCols.UPDATED_AT}
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (${summaryCols.MONTH_KEY})
      DO UPDATE SET
        ${summaryCols.TOTAL_ORDERS} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_ORDERS)} + EXCLUDED.${summaryCols.TOTAL_ORDERS}),
        ${summaryCols.TOTAL_REVENUE} = ${qualifiedSummaryCol(summaryCols.TOTAL_REVENUE)} + EXCLUDED.${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT} = ${qualifiedSummaryCol(summaryCols.TOTAL_PROFIT)} + EXCLUDED.${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_IMPORT)} + EXCLUDED.${summaryCols.TOTAL_IMPORT}),
        ${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT} = ${qualifiedSummaryCol(summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT)} + EXCLUDED.${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT},
        ${summaryCols.ESTIMATED_BANK_BALANCE} = ${qualifiedSummaryCol(summaryCols.ESTIMATED_BANK_BALANCE)} + EXCLUDED.${summaryCols.ESTIMATED_BANK_BALANCE},
        ${summaryCols.UPDATED_AT} = NOW()
    `,
    [monthKey, orders, revenue, profit, imp, offFlow, bankBalance]
  );
  await recomputeSummaryMonthTotalTax(client, monthKey);
  if (!notify) return;
  await notifyFinanceMonthlyDelta({
    monthKey,
    revenueDelta: revenue,
    profitDelta: profit,
    importDelta: imp,
    refundDelta: 0,
    offFlowDelta: offFlow,
    bankBalanceDelta: bankBalance,
    context,
    executor: client,
  });
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
    notify = true,
    notifyContext = "webhook.incrementDashboardSummaryByDelta",
  }
) => {
  const wire = normalizeMoney(revenueAmount);
  const offFlow = normalizeMoney(
    amountDecision?.offFlowForOrder ?? amountDecision?.offFlowCurrent
  );
  if ((!wire && !offFlow && !ordersDelta) || !state) {
    return { revenue: 0, profit: 0, offFlow: 0, importDelta: 0 };
  }

  const cost = normalizeMoney(state[ORDER_COLS.cost]);
  const supplierName = await fetchSupplierNameBySupplyId(
    client,
    state?.[ORDER_COLS.idSupply]
  );
  const skipCostDeduction = isMavrykShopSupplierName(supplierName);
  const effectiveCost = skipCostDeduction ? 0 : cost;
  const impliedMargin = normalizeMoney(wire - effectiveCost);
  let netProfitForLedger = 0;
  let importDeltaForAudit = 0;

  if (profitPostingMode === "revenue_equals_profit") {
    netProfitForLedger = wire;
    await incrementDashboardSummaryByDelta(client, paidMonthKey, {
      revenueDelta: wire,
      profitDelta: wire,
      ordersDelta,
      notify,
      context: notifyContext,
    });
  } else {
    await incrementDashboardSummaryByDelta(client, paidMonthKey, {
      revenueDelta: wire,
      profitDelta: wire,
      ordersDelta,
      notify,
      context: notifyContext,
    });
    if (effectiveCost > 0) {
      importDeltaForAudit = await resolveDashboardImportDeltaOnPaid(
        client,
        state,
        effectiveCost,
        fetchSupplierNameBySupplyId,
        paidMonthKey
      );
      await incrementDashboardSummaryByDelta(client, paidMonthKey, {
        profitDelta: -effectiveCost,
        importDelta: importDeltaForAudit,
        notify,
        context: notifyContext,
      });
    }
    netProfitForLedger = impliedMargin;
  }

  if (offFlow > 0) {
    await incrementDashboardSummaryByDelta(client, paidMonthKey, {
      offFlowDelta: offFlow,
      ordersDelta: 0,
      notify,
      context: notifyContext,
    });
    if (receiptId) {
      try {
        await withSavepoint(client, "off_flow_credit_order_split", async () => {
          await ensureOffFlowRefundCreditNote(client, {
            paymentReceiptId: receiptId,
            offFlowAmount: offFlow,
            monthKey: paidMonthKey,
            customerName: state?.[ORDER_COLS.customer],
            customerContact: state?.[ORDER_COLS.contact],
            sourceOrderCode: code,
            ruleBranch: ruleBranch || "WEBHOOK_ORDER_OFF_FLOW_SPLIT",
          });
        });
      } catch (creditErr) {
        logger.warn("[Webhook] Không tạo credit ngoài luồng (chênh CK đơn)", {
          orderCode: code,
          receiptId,
          error: creditErr.message,
        });
      }
    }
  }

  if (receiptId) {
    await insertFinancialAuditLog(client, {
      payment_receipt_id: receiptId,
      order_code: code,
      rule_branch: ruleBranch,
      delta: {
        posted_revenue: wire,
        posted_profit: netProfitForLedger,
        posted_off_flow_bank_receipt: offFlow > 0 ? offFlow : undefined,
        profit_provisional_wire: profitPostingMode === "transition_to_paid" ? wire : undefined,
        profit_deduct_cost_on_paid:
          profitPostingMode === "transition_to_paid" && effectiveCost > 0
            ? effectiveCost
            : undefined,
        total_import_add_on_paid:
          profitPostingMode === "transition_to_paid" && importDeltaForAudit > 0
            ? importDeltaForAudit
            : undefined,
        total_import_via_supplier_cost_log_recalc:
          profitPostingMode === "transition_to_paid" &&
          effectiveCost > 0 &&
          importDeltaForAudit === 0
            ? true
            : undefined,
        mavryk_supplier_skip_cost_deduction:
          profitPostingMode === "transition_to_paid" && skipCostDeduction
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
          requiredMinForSuccessfulPayment(state[ORDER_COLS.price]),
        shortfall_amount: amountDecision?.shortfallAmount ?? 0,
        max_accepted_shortfall:
          amountDecision?.maxAcceptedShortfall ?? UNDERPAY_TOLERANCE_VND - 1,
        recognized_revenue_current: amountDecision?.recognizedRevenueCurrent ?? wire,
        recognized_revenue_for_order:
          amountDecision?.recognizedRevenueForOrder ?? wire,
        off_flow_current: amountDecision?.offFlowCurrent ?? 0,
        off_flow_for_order:
          amountDecision?.offFlowForOrder ?? offFlow,
        off_flow_source_order_code: offFlow > 0 ? code : undefined,
        webhook_amount_flow: amountDecision?.webhookAmountFlow ?? "WEBHOOK_AMOUNT",
      },
      source: "webhook",
    });
  }

  return { revenue: wire, profit: netProfitForLedger, offFlow, importDelta: importDeltaForAudit };
};

const computeWebhookAmountDecision = computeDashboardPaymentDecision;

const resolveOrderPriceForWebhookMatch = async (client, orderCode, state, statusValue) => {
  const stored = normalizeMoney(state?.[ORDER_COLS.price]);
  const storedGross = normalizeMoney(state?.[ORDER_COLS.grossSellingPrice]);
  const creditApplied = normalizeMoney(state?.credit_applied_amount);
  const netSalePrice = normalizeMoney(stored + creditApplied);
  // Đơn có áp credit: `price` là số còn thu qua NH; gross có thể lệch — ưu tiên net sale.
  let baseOrderPrice = storedGross > 0 ? storedGross : stored;
  if (storedGross > 0 && netSalePrice > 0 && storedGross > netSalePrice) {
    baseOrderPrice = netSalePrice;
  }
  if (statusValue !== ORDER_STATUS.RENEWAL || !state) {
    return baseOrderPrice;
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
  } catch (error) {
    logger.warn("[Webhook] Không tính được giá hiện tại khi gia hạn, dùng giá trên đơn", {
      orderCode,
      error: error?.message,
    });
  }
  return baseOrderPrice;
};

const getAccumulatedReceiptAmount = async (client, orderCode, orderDateRaw) => {
  const normalizedCode = String(orderCode || "").trim();
  if (!normalizedCode) return 0;
  const parsedOrderDate = parseFlexibleDate(orderDateRaw);
  const now = new Date();
  const fromDate = parsedOrderDate
    ? parsedOrderDate > now
      ? "1900-01-01"
      : parsedOrderDate.toISOString().slice(0, 10)
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

module.exports = {
  toMonthKey,
  fetchSupplierNameBySupplyId,
  incrementDashboardSummaryByDelta,
  postWebhookPaymentForOrder,
  computeWebhookAmountDecision,
  resolveOrderPriceForWebhookMatch,
  getAccumulatedReceiptAmount,
  monthKeyFromPaidDateYmd,
};
