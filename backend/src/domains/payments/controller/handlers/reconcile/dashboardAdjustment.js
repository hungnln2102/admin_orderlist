const { STATUS } = require("@/utils/statuses");
const {
  TABLES,
  ORDER_COLS,
  RECEIPT_STATE_COLS,
  PAYMENT_RECEIPT_DEF,
} = require("@/domains/payments/controller/shared/constants");
const { normalizeMoney, toMonthKey } = require("@/domains/payments/controller/shared/helpers");
const { applyDashboardDelta } = require("@/domains/payments/controller/shared/dashboardDelta");
const { insertReconcileAuditLog } = require("@/domains/payments/controller/handlers/reconcile/auditLog");
const { ensureOffFlowRefundCreditNote } = require("@/domains/orders/controller/finance/offFlowRefundCredits");
const { resolveDashboardImportDeltaOnPaid } = require("@/domains/orders/controller/finance/dashboardImportDeltaOnPaid");
const { fetchSupplierNameBySupplyId } = require("@/domains/payments/controller/handlers/reconcile/fetchSupplierNameBySupplyId");

/**
 * Áp delta dashboard cho 1 lần reconcile receipt.
 *
 * - Nếu `adjustmentApplied = true` ở state cũ → chỉ ghi audit "skipped".
 * - Ngược lại: tính revenue/profit/off-flow delta theo trạng thái đơn,
 *   gọi `applyDashboardDelta`, cập nhật `payment_receipt_financial_state`
 *   và ghi audit log với rule branch tương ứng.
 *
 * Return: `{ revenueDelta, profitDelta, offFlowDelta, nextPostedRevenue,
 *           nextPostedProfit, nextPostedOffFlowBankReceipt }`.
 */
const applyReconcileDashboardAdjustment = async (
  trx,
  {
    receiptId,
    receiptRow,
    stateRow,
    orderRow,
    orderCodeRaw,
    statusValue,
    paymentDecision,
    orderSellingPriceVnd,
    totalReceiptsForOrderVnd,
    effectiveAction,
  }
) => {
  const adjustmentApplied = !!stateRow?.[RECEIPT_STATE_COLS.adjustmentApplied];
  const postedRevenue = Number(stateRow?.[RECEIPT_STATE_COLS.postedRevenue]) || 0;
  const postedProfit = Number(stateRow?.[RECEIPT_STATE_COLS.postedProfit]) || 0;
  const postedOffFlowBankReceipt =
    Number(stateRow?.[RECEIPT_STATE_COLS.postedOffFlowBankReceipt]) || 0;

  if (adjustmentApplied) {
    await insertReconcileAuditLog(trx, {
      receiptId,
      orderCode: orderCodeRaw,
      ruleBranch: "RECONCILE_SKIPPED_ALREADY_APPLIED",
      delta: {
        reason: "adjustment already applied",
        action: effectiveAction,
      },
    });
    return {
      revenueDelta: 0,
      profitDelta: 0,
      offFlowDelta: 0,
      nextPostedRevenue: postedRevenue,
      nextPostedProfit: postedProfit,
      nextPostedOffFlowBankReceipt: postedOffFlowBankReceipt,
    };
  }

  const receiptMonthKey = toMonthKey(receiptRow[PAYMENT_RECEIPT_DEF.columns.paidDate]);
  const receiptAmt = normalizeMoney(receiptRow[PAYMENT_RECEIPT_DEF.columns.amount]);
  const recognizedRevenue = normalizeMoney(
    paymentDecision.recognizedRevenueForOrder ?? paymentDecision.recognizedRevenueCurrent
  );
  const offFlowForReceipt = normalizeMoney(
    paymentDecision.offFlowForOrder ?? paymentDecision.offFlowCurrent
  );

  let revenueDelta = 0;
  let profitDelta = 0;
  let offFlowDelta = 0;
  let importDelta = 0;

  if (statusValue === STATUS.PAID || statusValue === STATUS.PROCESSING) {
    // Đơn đã được xử lý trước đó: hoàn tác DT/LN và/hoặc bucket ngoài luồng từ receipt không mã / biên thêm.
    revenueDelta = -postedRevenue;
    profitDelta = -postedProfit;
    offFlowDelta = -postedOffFlowBankReceipt;
  } else if (statusValue === STATUS.UNPAID || statusValue === STATUS.RENEWAL) {
    const cost = normalizeMoney(orderRow[ORDER_COLS.cost]);
    if (postedOffFlowBankReceipt > 0) {
      revenueDelta = recognizedRevenue;
      profitDelta = recognizedRevenue - cost;
      offFlowDelta = offFlowForReceipt - postedOffFlowBankReceipt;
      if (revenueDelta > 0 && cost > 0) {
        importDelta = await resolveDashboardImportDeltaOnPaid(
          trx,
          orderRow,
          cost,
          fetchSupplierNameBySupplyId,
          receiptMonthKey
        );
      }
    } else {
      // Receipt chưa ghi off-flow trước đó — chỉnh LN − cost + cộng import.
      profitDelta = -cost;
      if (cost > 0) {
        importDelta = await resolveDashboardImportDeltaOnPaid(
          trx,
          orderRow,
          cost,
          fetchSupplierNameBySupplyId,
          receiptMonthKey
        );
      }
    }
  }

  const reconcileRuleBranch =
    statusValue === STATUS.PAID || statusValue === STATUS.PROCESSING
      ? "RECONCILE_CASE1_REVERSE_TEMP_POST"
      : "RECONCILE_CASE2_UNPAID_RENEWAL_PROFIT_ADJUST";

  await applyDashboardDelta(trx, receiptMonthKey, {
    revenueDelta,
    profitDelta,
    ordersDelta: 0,
    importDelta,
    offFlowDelta,
  });

  if (offFlowDelta > 0) {
    try {
      await trx.transaction(async (spTrx) => {
        await ensureOffFlowRefundCreditNote(spTrx, {
          paymentReceiptId: receiptId,
          offFlowAmount: offFlowDelta,
          monthKey: receiptMonthKey,
          customerName: orderRow?.[ORDER_COLS.customer] ?? orderRow?.customer,
          customerContact: orderRow?.[ORDER_COLS.contact] ?? orderRow?.contact,
          sourceOrderCode: orderCodeRaw,
          ruleBranch: reconcileRuleBranch,
        });
      });
    } catch (creditErr) {
      // Không chặn reconcile nếu tạo credit lỗi — dashboard đã cập nhật.
      const logger = require("@/utils/logger");
      logger.warn("[Reconcile] Không tạo credit ngoài luồng", {
        receiptId,
        error: creditErr.message,
      });
    }
  }

  const nextPostedRevenue = postedRevenue + revenueDelta;
  const nextPostedProfit = postedProfit + profitDelta;
  const nextPostedOffFlowBankReceipt = postedOffFlowBankReceipt + offFlowDelta;

  await trx(TABLES.paymentReceiptState)
    .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
    .update({
      [RECEIPT_STATE_COLS.isFinancialPosted]: true,
      [RECEIPT_STATE_COLS.postedRevenue]: nextPostedRevenue,
      [RECEIPT_STATE_COLS.postedProfit]: nextPostedProfit,
      [RECEIPT_STATE_COLS.postedOffFlowBankReceipt]: nextPostedOffFlowBankReceipt,
      [RECEIPT_STATE_COLS.reconciledAt]: new Date(),
      [RECEIPT_STATE_COLS.adjustmentApplied]: true,
      [RECEIPT_STATE_COLS.updatedAt]: new Date(),
    });

  await insertReconcileAuditLog(trx, {
    receiptId,
    orderCode: orderCodeRaw,
    ruleBranch: reconcileRuleBranch,
    delta: {
      revenueDelta,
      profitDelta,
      offFlowDelta,
      importDelta,
      postedRevenue: nextPostedRevenue,
      postedProfit: nextPostedProfit,
      postedOffFlowBankReceipt: nextPostedOffFlowBankReceipt,
      orderSellingPriceVnd,
      receiptAmount: receiptAmt,
      totalReceiptsForOrderVnd,
      requiredMin: paymentDecision.requiredMin,
      maxAcceptedShortfall: paymentDecision.maxAcceptedShortfall,
      shortfallAmount: paymentDecision.shortfallAmount,
      recognized_revenue_current: normalizeMoney(paymentDecision.recognizedRevenueCurrent),
      recognized_revenue_for_order: recognizedRevenue,
      off_flow_current: offFlowForReceipt,
      off_flow_for_order: offFlowForReceipt,
      off_flow_source_order_code: offFlowForReceipt > 0 ? orderCodeRaw : undefined,
      orderStatus: statusValue,
      action: effectiveAction,
    },
  });

  return {
    revenueDelta,
    profitDelta,
    offFlowDelta,
    importDelta,
    nextPostedRevenue,
    nextPostedProfit,
    nextPostedOffFlowBankReceipt,
  };
};

module.exports = { applyReconcileDashboardAdjustment };
