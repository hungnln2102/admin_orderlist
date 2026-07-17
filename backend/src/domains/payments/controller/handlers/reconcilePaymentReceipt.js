const { withTransaction } = require("@/db");
const { STATUS } = require("@/utils/statuses");
const logger = require("@/utils/logger");
const {
  TABLES,
  ORDER_COLS,
  RECEIPT_STATE_COLS,
  PAYMENT_RECEIPT_DEF,
  RECONCILE_ACTIONS,
  SUPPORTED_RECONCILE_ACTIONS,
} = require("@/domains/payments/controller/shared/constants");
const { normalizeMoney } = require("@/domains/payments/controller/shared/helpers");
const {
  computeDashboardPaymentDecision,
} = require("@/domains/orders/controller/finance/dashboardPaymentPostingPolicy");
const { enqueueRenewal } = require("../../../../../webhook/sepay/renewalQueue");
const {
  applyReconcileDashboardAdjustment,
} = require("@/domains/payments/controller/handlers/reconcile/dashboardAdjustment");
const {
  applyMarkPaidAction,
  applyRenewAction,
} = require("@/domains/payments/controller/handlers/reconcile/actionHandlers");
const {
  voidOffFlowCreditByReceiptId,
} = require("@/domains/orders/controller/finance/offFlowRefundCredits");

/**
 * Quyết định `effectiveAction` từ `requestedAction` + trạng thái đơn + khả năng cover.
 *
 * - `reconcile_only` + UNPAID + đủ tiền → tự nâng thành `mark_paid`.
 * - `reconcile_and_mark_paid` + UNPAID + thiếu tiền → hạ về `only` (vẫn gắn mã).
 */
const resolveEffectiveAction = (requestedAction, statusValueInitial, paidAmountCoversOrder) => {
  if (requestedAction === RECONCILE_ACTIONS.ONLY) {
    if (statusValueInitial === STATUS.UNPAID && paidAmountCoversOrder) {
      return RECONCILE_ACTIONS.MARK_PAID;
    }
  } else if (requestedAction === RECONCILE_ACTIONS.MARK_PAID) {
    if (statusValueInitial === STATUS.UNPAID && !paidAmountCoversOrder) {
      // Gắn mã vẫn lưu; không rollback — chỉ bỏ bước chuyển "Đã Thanh Toán" khi thiếu tiền.
      return RECONCILE_ACTIONS.ONLY;
    }
  }
  return requestedAction;
};

const reconcilePaymentReceipt = async (req, res) => {
  const receiptId = Number.parseInt(req.params.receiptId, 10);
  const rawOrderCodeValue = String(req.body?.orderCode || "").trim().toUpperCase();
  const extractedOrderCode = rawOrderCodeValue.match(/MAV[A-Z0-9]{3,20}/)?.[0] || "";
  const orderCodeRaw = extractedOrderCode || rawOrderCodeValue;
  const requestedActionRaw = String(req.body?.action || RECONCILE_ACTIONS.ONLY)
    .trim()
    .toLowerCase();
  const requestedAction = requestedActionRaw || RECONCILE_ACTIONS.ONLY;
  if (!Number.isFinite(receiptId) || receiptId <= 0) {
    return res.status(400).json({ error: "receiptId không hợp lệ." });
  }
  if (!/^MAV[A-Z0-9]{3,20}$/i.test(orderCodeRaw)) {
    return res.status(400).json({ error: "orderCode không đúng định dạng MAV." });
  }
  if (!SUPPORTED_RECONCILE_ACTIONS.has(requestedAction)) {
    return res.status(400).json({
      error:
        "action không hợp lệ. Chỉ chấp nhận reconcile_only, reconcile_and_mark_paid, reconcile_and_renew.",
    });
  }

  try {
    const result = await withTransaction(async (trx) => {
      const receiptRow = await trx(TABLES.paymentReceipt)
        .where(PAYMENT_RECEIPT_DEF.columns.id, receiptId)
        .first();
      if (!receiptRow) throw new Error("Không tìm thấy biên lai.");

      let stateRow = await trx(TABLES.paymentReceiptState)
        .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
        .first();
      if (!stateRow) {
        await trx(TABLES.paymentReceiptState).insert({
          [RECEIPT_STATE_COLS.paymentReceiptId]: receiptId,
        });
        stateRow = await trx(TABLES.paymentReceiptState)
          .where(RECEIPT_STATE_COLS.paymentReceiptId, receiptId)
          .first();
      }

      const orderRow = await trx(TABLES.orderList)
        .whereRaw(`LOWER(${ORDER_COLS.idOrder}) = LOWER(?)`, [orderCodeRaw])
        .first();
      if (!orderRow) throw new Error("Không tìm thấy đơn hàng để reconcile.");

      await trx(TABLES.paymentReceipt)
        .where(PAYMENT_RECEIPT_DEF.columns.id, receiptId)
        .update({
          [PAYMENT_RECEIPT_DEF.columns.orderCode]: orderCodeRaw,
        });

      const adjustmentApplied = !!stateRow?.[RECEIPT_STATE_COLS.adjustmentApplied];
      const statusValueInitial = String(orderRow[ORDER_COLS.status] || "").trim();
      const orderSellingPriceVnd = normalizeMoney(orderRow[ORDER_COLS.price]);
      const oCodeCol = PAYMENT_RECEIPT_DEF.columns.orderCode;
      const aAmtCol = PAYMENT_RECEIPT_DEF.columns.amount;
      const sumRes = await trx(TABLES.paymentReceipt)
        .whereRaw(`LOWER(TRIM(COALESCE(??, '')::text)) = LOWER(?)`, [oCodeCol, orderCodeRaw])
        .sum({ total_receipts: aAmtCol })
        .first();
      const totalReceiptsForOrderVnd = normalizeMoney(sumRes?.total_receipts);
      const paymentDecision = computeDashboardPaymentDecision({
        orderPrice: orderSellingPriceVnd,
        currentAmount: normalizeMoney(receiptRow[PAYMENT_RECEIPT_DEF.columns.amount]),
        accumulatedAmount: totalReceiptsForOrderVnd,
        creditAppliedAmount: 0,
      });
      // Giá bán 0/âm: giữ hành vi cũ (tự nâng mark paid nếu đơn Chưa Thanh Toán với luồng only).
      const paidAmountCoversOrder =
        orderSellingPriceVnd <= 0 ? true : paymentDecision.complete;

      // Mặc định luồng "Sửa mã đơn" (reconcile_only) tự mark paid nếu đơn Chưa Thanh Toán
      // và tổng biên lai gắn mã đủ theo policy thiếu < 5.000 VND. Tránh đưa "Đã Thanh Toán"
      // khi thiếu đúng 5.000 VND trở lên.
      const effectiveAction = resolveEffectiveAction(
        requestedAction,
        statusValueInitial,
        paidAmountCoversOrder
      );
      let statusValue = statusValueInitial;

      const adjustment = await applyReconcileDashboardAdjustment(trx, {
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
      });

      const actionResult = {
        actionApplied: effectiveAction,
        actionRequested: requestedAction,
        statusBeforeAction: statusValueInitial,
        statusAfterAction: statusValue,
      };

      // Void credit off-flow gắn biên lai này (nếu có) — tiền đã match đơn,
      // không còn "ngoài luồng" → credit không còn khả dụng.
      try {
        await trx.transaction(async (spTrx) => {
          await voidOffFlowCreditByReceiptId(
            spTrx,
            receiptId,
            `Reconcile match mã đơn ${orderCodeRaw}.`
          );
        });
      } catch (voidErr) {
        logger.warn("[payments] Không void được credit off-flow khi reconcile", {
          receiptId,
          orderCode: orderCodeRaw,
          error: voidErr.message,
        });
      }
      let shouldRunRenewal = false;

      if (effectiveAction === RECONCILE_ACTIONS.MARK_PAID) {
        const markPaidResult = await applyMarkPaidAction(trx, {
          receiptId,
          orderRow,
          orderCodeRaw,
          statusValueInitial,
        });
        statusValue = markPaidResult.statusValue;
        actionResult.statusAfterAction = statusValue;
      } else if (effectiveAction === RECONCILE_ACTIONS.RENEW) {
        const renewResult = await applyRenewAction(trx, {
          receiptId,
          orderCodeRaw,
          statusValueInitial,
        });
        shouldRunRenewal = renewResult.shouldRunRenewal;
      }

      return {
        receiptId,
        orderCode: orderCodeRaw,
        status: statusValue,
        revenueDelta: adjustment.revenueDelta,
        profitDelta: adjustment.profitDelta,
        offFlowDelta: adjustment.offFlowDelta,
        postedRevenue: adjustment.nextPostedRevenue,
        postedProfit: adjustment.nextPostedProfit,
        postedOffFlowBankReceipt: adjustment.nextPostedOffFlowBankReceipt,
        reconciledAt: new Date().toISOString(),
        skipped: adjustmentApplied,
        reason: adjustmentApplied ? "adjustment already applied" : null,
        actionResult,
        shouldRunRenewal,
        effectiveAction,
        orderSellingPriceVnd,
        totalReceiptsForOrderVnd,
        paidAmountCoversOrder,
      };
    });

    let renewalStatus = null;
    let renewalDispatchedVia = null;
    let renewalError = null;
    if (result.shouldRunRenewal) {
      try {
        const enqueueResult = await enqueueRenewal(orderCodeRaw, {
          forceRenewal: true,
          source: "manual",
        });
        renewalStatus = enqueueResult?.status || "queued";
        renewalDispatchedVia = enqueueResult?.dispatched || null;
      } catch (enqueueError) {
        renewalStatus = "enqueue_failed";
        renewalError = enqueueError?.message || "Không thể enqueue renewal.";
        logger.error("[payments] Reconcile thành công nhưng enqueue renewal thất bại", {
          receiptId,
          orderCode: orderCodeRaw,
          action: requestedAction,
          error: renewalError,
          stack: enqueueError?.stack,
        });
      }
    }
    if (!result.shouldRunRenewal) {
      renewalStatus = "not_requested";
    }
    const actionResult = {
      ...(result.actionResult || {}),
    };
    const renewalAccepted = renewalStatus === "queued" || renewalStatus === "already_queued";

    return res.json({
      success: true,
      reconciled: true,
      actionRequested: requestedAction,
      actionApplied: result.effectiveAction || requestedAction,
      ...result,
      shouldRunRenewal: undefined,
      effectiveAction: undefined,
      actionResult,
      renewal_status: renewalStatus,
      renewal_dispatched_via: renewalDispatchedVia,
      renewal_error: renewalError,
      renewalSuccess: result.shouldRunRenewal ? renewalAccepted : null,
      renewalDetails: result.shouldRunRenewal
        ? {
            status: renewalStatus,
            dispatched_via: renewalDispatchedVia,
            error: renewalError,
          }
        : null,
    });
  } catch (error) {
    const statusCode = Number(error?.status) || 500;
    if (statusCode >= 400 && statusCode < 500) {
      // 4xx = rule nghiệp vụ / idempotent (vd: đơn đã đổi trạng thái) — không gửi Telegram warn.
      logger.debug("[payments] Từ chối reconcile biên lai (HTTP client/rule)", {
        receiptId,
        orderCode: orderCodeRaw,
        action: requestedAction,
        statusCode,
        error: error.message,
      });
    } else {
      logger.error("[payments] Reconcile biên lai thất bại", {
        receiptId,
        orderCode: orderCodeRaw,
        action: requestedAction,
        statusCode,
        error: error.message,
        stack: error.stack,
      });
    }
    return res.status(statusCode).json({ error: error.message || "Không thể reconcile biên lai." });
  }
};

module.exports = { reconcilePaymentReceipt };
