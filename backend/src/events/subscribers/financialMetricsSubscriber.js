const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const logger = require("@/utils/logger");
const db = require("@/db/knexClient");
const shopBankAccountRepository = require("@/domains/wallet/shop-bank-accounts/repositories/shopBankAccountRepository");
const dashboardSummaryRepository = require("@/domains/wallet/repositories/dashboardSummaryRepository");
const { notifyFinanceMonthlyDelta } = require("@/services/telegramFinanceDeltaNotifier");

/**
 * 1 & 2. Nhận Webhook Sepay (Thanh toán đơn & Gia hạn)
 * Công thức: Doanh thu += Số tiền nhận
 *            Chi phí += Cost NCC
 *            Lợi nhuận = Số tiền nhận - Cost NCC
 * LƯU Ý: Bank balance KHÔNG cộng ở đây — receiptPhase.js đã ghi ledger chính xác
 *         qua creditShopBankFromPaymentReceipt(). Xem analysis bug gấp 3x bank balance.
 */
async function handleOrderPaymentReceived(payload) {
  try {
    const { amount, cost, profit: payloadProfit, monthKey, orderCode, revenue: payloadRevenue, offFlow: payloadOffFlow } = payload;
    
    // Dùng giá trị đã được bóc tách từ payload. Fallback nếu là event từ hệ thống cũ.
    const revenue = payloadRevenue !== undefined ? Number(payloadRevenue) : (orderCode ? (Number(amount) || 0) : 0);
    const offFlow = payloadOffFlow !== undefined ? Number(payloadOffFlow) : (!orderCode ? (Number(amount) || 0) : 0);
    const importCost = Number(cost) || 0;
    const profit = payloadProfit !== undefined ? Number(payloadProfit) : (revenue - importCost);

    logger.info(`[FinancialMetrics] Tiền vào đơn ${orderCode || 'NGOẠI LUỒNG'}: Doanh thu +${revenue}, Chi phí +${importCost}, Lợi nhuận +${profit}, Ngoài luồng +${offFlow}`);

    // Nếu thiếu monthKey, fallback về tháng hiện tại
    const finalMonthKey = monthKey || new Date().toISOString().slice(0, 7);

    // 1. Cập nhật bảng dashboard_monthly_summary (Upsert) các metric có thay đổi
    const increments = {};
    if (revenue !== 0) increments[dashboardSummaryRepository.COLS.TOTAL_REVENUE] = revenue;
    if (profit !== 0) increments[dashboardSummaryRepository.COLS.TOTAL_PROFIT] = profit;
    if (importCost !== 0) increments[dashboardSummaryRepository.COLS.TOTAL_IMPORT] = importCost;
    if (offFlow !== 0) increments[dashboardSummaryRepository.COLS.TOTAL_OFF_FLOW_BANK_RECEIPT] = offFlow;

    if (Object.keys(increments).length > 0) {
      await dashboardSummaryRepository.incrementMonthlyMetrics(finalMonthKey, increments);
    }

    // 3. Bắn Telegram thông báo biến động tháng & Ghi log audit
    await notifyFinanceMonthlyDelta({
      monthKey: finalMonthKey,
      revenueDelta: revenue,
      profitDelta: profit,
      importDelta: importCost,
      bankBalanceDelta: 0,
      offFlowDelta: offFlow,
      context: payload.isRenewal ? `renewal.sepay:${orderCode}` : `webhook.sepay.combined`,
      executor: db,
    });

    logger.info(`[FinancialMetrics] Đã ghi nhận SQL thành công cho đơn ${orderCode}`);
  } catch (error) {
    logger.error('[FinancialMetrics] Lỗi SQL khi handleOrderPaymentReceived', { error: error.message });
  }
}

/**
 * 3. Xóa đơn hàng
 * Công thức: Số tiền trừ = (Tổng tiền đơn * Số ngày còn lại) / Tổng ngày
 *            Doanh thu -= Số tiền trừ
 *            Lợi nhuận -= Số tiền trừ
 */
async function handleOrderDeleted(payload) {
  try {
    const { orderCode, totalAmount, daysRemaining, totalDays, monthKey } = payload;

    let amountToDeduct = 0;
    if (totalDays > 0) {
      amountToDeduct = (totalAmount * daysRemaining) / totalDays;
    }

    if (amountToDeduct <= 0) return;

    logger.info(`[FinancialMetrics] Xóa đơn ${orderCode}: Trừ Doanh thu/Lợi nhuận -${amountToDeduct}`);
    const finalMonthKey = monthKey || new Date().toISOString().slice(0, 7);

    const increments = {
      [dashboardSummaryRepository.COLS.TOTAL_REVENUE]: -amountToDeduct,
      [dashboardSummaryRepository.COLS.TOTAL_PROFIT]: -amountToDeduct,
    };
    await dashboardSummaryRepository.incrementMonthlyMetrics(finalMonthKey, increments);

    // 3. Bắn Telegram thông báo biến động tháng & Ghi log audit
    await notifyFinanceMonthlyDelta({
      monthKey: finalMonthKey,
      revenueDelta: -amountToDeduct,
      profitDelta: -amountToDeduct,
      context: `dashboardSummary.refund.statusChange`,
      executor: db,
    });
  } catch (error) {
    logger.error('[FinancialMetrics] Lỗi handleOrderDeleted', { error: error.message });
  }
}

/**
 * 4. Rút tiền (Withdrawal)
 * Công thức: Chỉ trừ tiền trong Bank. KHÔNG tác động Doanh thu / Lợi nhuận
 */
async function handleWithdrawal(payload) {
  try {
    const { amount, bankAccountId, usdtWalletId, targetWalletId, reason } = payload;
    const amountVal = Number(amount) || 0;
    logger.info(`[FinancialMetricsSubscriber] Rút tiền (MONEY_WITHDRAWN): Số tiền = ${amountVal}, Tài khoản nguồn = ${bankAccountId || usdtWalletId || 'N/A'}, Tài khoản nhận = ${targetWalletId || 'N/A'}, Lý do = ${reason || 'N/A'}`);
  } catch (error) {
    logger.error('[FinancialMetrics] Lỗi handleWithdrawal', { error: error.message });
  }
}

/**
 * 5. Nhập ngoài luồng (Chi phí phát sinh)
 * Công thức: Trừ Lợi nhuận
 *            Trừ tiền trong Bank
 */
async function handleManualExpense(payload) {
  try {
    const { amount, monthKey, bankAccountId } = payload;
    const amountToDeduct = Number(amount) || 0;
    if (amountToDeduct <= 0) return;

    logger.info(`[FinancialMetrics] Chi phí ngoài luồng: Trừ Lợi nhuận -${amountToDeduct}, Trừ Sổ Quỹ -${amountToDeduct}`);
    const finalMonthKey = monthKey || new Date().toISOString().slice(0, 7);

    await db.transaction(async (trx) => {
      if (bankAccountId) {
        await shopBankAccountRepository.decrementBalance(bankAccountId, amountToDeduct, { client: trx });
      }

      const increments = {
        [dashboardSummaryRepository.COLS.TOTAL_PROFIT]: -amountToDeduct,
        [dashboardSummaryRepository.COLS.ESTIMATED_BANK_BALANCE]: -amountToDeduct,
      };
      await dashboardSummaryRepository.incrementMonthlyMetrics(finalMonthKey, increments, { client: trx });

      await notifyFinanceMonthlyDelta({
        monthKey: finalMonthKey,
        profitDelta: -amountToDeduct,
        bankBalanceDelta: -amountToDeduct,
        context: `manualWebhook.incrementDashboardSummaryByDelta`,
        executor: trx,
      });
    });
  } catch (error) {
    logger.error('[FinancialMetrics] Lỗi handleManualExpense', { error: error.message });
  }
}

/**
 * 6. Thanh toán NCC (Supplier Payment)
 * Công thức: Chỉ trừ/cộng estimated_bank_balance trong DashboardSummary.
 * Tiền thực tế trong Bank và các log Telegram / Ledger đã được xử lý đồng bộ ở confirmPaymentSupply.js.
 */
async function handleSupplierPayment(payload) {
  try {
    const { amount, monthKey, direction } = payload;
    const amountVal = Number(amount) || 0;
    if (amountVal <= 0) return;

    const isRefund = direction === "supplier_refund_to_shop";
    const delta = isRefund ? amountVal : -amountVal;

    logger.info(`[FinancialMetrics] Xác nhận thanh toán/hoàn tiền NCC: Cập nhật estimated_bank_balance ${delta}`);
    const finalMonthKey = monthKey || new Date().toISOString().slice(0, 7);

    await db.transaction(async (trx) => {
      const increments = {
        [dashboardSummaryRepository.COLS.ESTIMATED_BANK_BALANCE]: delta,
      };
      await dashboardSummaryRepository.incrementMonthlyMetrics(finalMonthKey, increments, { client: trx });
    });
  } catch (error) {
    logger.error('[FinancialMetrics] Lỗi handleSupplierPayment', { error: error.message });
  }
}

/**
 * 7. Hoàn tiền credit (Refund Credit Cashout)
 */
async function handleRefundCreditUpdated(payload) {
  try {
    const { action, cashoutAmount, shopBankAccountId } = payload;
    if (action === 'complete' && shopBankAccountId && cashoutAmount > 0) {
      const amountToDeduct = Number(cashoutAmount) || 0;
      logger.info(`[FinancialMetrics] Hoàn tiền credit: Trừ estimated_bank_balance -${amountToDeduct}`);
      const cashoutMonthKey = new Date().toISOString().slice(0, 7);

      await db.transaction(async (trx) => {
        const increments = {
          [dashboardSummaryRepository.COLS.ESTIMATED_BANK_BALANCE]: -amountToDeduct,
        };
        await dashboardSummaryRepository.incrementMonthlyMetrics(cashoutMonthKey, increments, { client: trx });
      });
    }
  } catch (error) {
    logger.error('[FinancialMetrics] Lỗi handleRefundCreditUpdated', { error: error.message });
  }
}

function registerFinancialMetricsSubscribers() {
  eventBus.on(EVENTS.SEPAY_MONEY_IN, handleOrderPaymentReceived);
  eventBus.on(EVENTS.ORDER_DELETED, handleOrderDeleted);
  eventBus.on(EVENTS.MONEY_WITHDRAWN, handleWithdrawal);
  eventBus.on(EVENTS.MANUAL_EXPENSE_CREATED, handleManualExpense);
  eventBus.on(EVENTS.SUPPLY_PAYMENT_CONFIRMED, handleSupplierPayment);
  eventBus.on(EVENTS.REFUND_CREDIT_UPDATED, handleRefundCreditUpdated);
  logger.info('[FinancialMetricsSubscriber] Đã khởi tạo và gắn Event SEPAY_MONEY_IN, ORDER_DELETED, MONEY_WITHDRAWN, MANUAL_EXPENSE, SUPPLY_PAYMENT_CONFIRMED, REFUND_CREDIT_UPDATED');
}

module.exports = {
  registerFinancialMetricsSubscribers,
  handleOrderPaymentReceived,
  handleOrderDeleted,
  handleWithdrawal,
  handleManualExpense,
  handleSupplierPayment,
  handleRefundCreditUpdated
};
