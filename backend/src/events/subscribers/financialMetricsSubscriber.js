const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const logger = require("@/utils/logger");
const { pool } = require("@/config/database");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, ADMIN_SCHEMA, SCHEMA_ADMIN, tableName } = require("@/config/dbSchema");
const { notifyFinanceMonthlyDelta } = require("@/services/telegramFinanceDeltaNotifier");

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const bankTable = tableName(ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.TABLE, SCHEMA_ADMIN);
const bankCols = ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.COLS;
// Chú ý: bankTable / bankCols không dùng trong handleOrderPaymentReceived (Sepay Webhook)
// vì shop_bank_accounts đã được cập nhật nguyên tử qua shopBankLedgerService trong receiptPhase.js.
// Tuy nhiên, chúng vẫn được sử dụng ở dưới trong handleWithdrawal, handleManualExpense, handleSupplierPayment.
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
    const { amount, cost, profit: payloadProfit, monthKey, orderCode } = payload;
    const revenue = Number(amount) || 0;
    const importCost = Number(cost) || 0;
    const profit = payloadProfit !== undefined ? Number(payloadProfit) : (revenue - importCost);

    logger.info(`[FinancialMetrics] Tiền vào đơn ${orderCode}: Doanh thu +${revenue}, Chi phí +${importCost}, Lợi nhuận +${profit}`);

    // Nếu thiếu monthKey, fallback về tháng hiện tại
    const finalMonthKey = monthKey || new Date().toISOString().slice(0, 7);

    // 1. Cập nhật bảng dashboard_monthly_summary (Upsert) — CHỈ revenue/profit/import
    //    Bank balance (estimated_bank_balance) KHÔNG cộng ở đây vì
    //    receiptPhase.js → creditShopBankFromPaymentReceipt() đã ghi ledger chính xác.
    //    shop_bank_accounts.balance cũng KHÔNG cộng ở đây vì cùng lý do trên.
    const updateSummaryQuery = `
      INSERT INTO ${summaryTable} (
        ${summaryCols.MONTH_KEY}, 
        ${summaryCols.TOTAL_REVENUE}, 
        ${summaryCols.TOTAL_PROFIT}, 
        ${summaryCols.TOTAL_IMPORT}
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (${summaryCols.MONTH_KEY}) 
      DO UPDATE SET 
        ${summaryCols.TOTAL_REVENUE} = ${summaryTable}.${summaryCols.TOTAL_REVENUE} + EXCLUDED.${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT} = ${summaryTable}.${summaryCols.TOTAL_PROFIT} + EXCLUDED.${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT} = ${summaryTable}.${summaryCols.TOTAL_IMPORT} + EXCLUDED.${summaryCols.TOTAL_IMPORT},
        ${summaryCols.UPDATED_AT} = NOW();
    `;
    await pool.query(updateSummaryQuery, [finalMonthKey, revenue, profit, importCost]);

    // 2. shop_bank_accounts đã được cập nhật nguyên tử qua Ledger Service
    //    (creditShopBankFromPaymentReceipt trong receiptPhase.js) — không cập nhật lại ở đây.

    // 3. Bắn Telegram thông báo biến động tháng & Ghi log audit
    //    bankBalanceDelta = 0 vì bank đã được receiptPhase cập nhật,
    //    notify sẽ tự đọc bank balance thật từ shop_bank_accounts qua sumActiveShopBankBalances().
    await notifyFinanceMonthlyDelta({
      monthKey: finalMonthKey,
      revenueDelta: revenue,
      profitDelta: profit,
      importDelta: importCost,
      bankBalanceDelta: 0,
      context: payload.isRenewal ? `renewal.sepay:${orderCode}` : `webhook.sepay.combined`,
      executor: pool,
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

    const updateSummaryQuery = `
      INSERT INTO ${summaryTable} (
        ${summaryCols.MONTH_KEY}, 
        ${summaryCols.TOTAL_REVENUE}, 
        ${summaryCols.TOTAL_PROFIT}
      )
      VALUES ($1, -$2, -$2)
      ON CONFLICT (${summaryCols.MONTH_KEY}) 
      DO UPDATE SET 
        ${summaryCols.TOTAL_REVENUE} = COALESCE(${summaryTable}.${summaryCols.TOTAL_REVENUE}, 0) + EXCLUDED.${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT} = COALESCE(${summaryTable}.${summaryCols.TOTAL_PROFIT}, 0) + EXCLUDED.${summaryCols.TOTAL_PROFIT},
        ${summaryCols.UPDATED_AT} = NOW();
    `;
    await pool.query(updateSummaryQuery, [finalMonthKey, amountToDeduct]);

    // 3. Bắn Telegram thông báo biến động tháng & Ghi log audit
    await notifyFinanceMonthlyDelta({
      monthKey: finalMonthKey,
      revenueDelta: -amountToDeduct,
      profitDelta: -amountToDeduct,
      context: `dashboardSummary.refund.statusChange`,
      executor: pool,
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
    const { amount, bankAccountId, monthKey } = payload;
    const amountToDeduct = Number(amount) || 0;
    if (amountToDeduct <= 0) return;

    logger.info(`[FinancialMetrics] Rút tiền: Trừ Sổ Quỹ (Bank) -${amountToDeduct}`);
    const finalMonthKey = monthKey || new Date().toISOString().slice(0, 7);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (bankAccountId) {
        const updateBankQuery = `
          UPDATE ${bankTable}
          SET ${bankCols.BALANCE} = COALESCE(${bankCols.BALANCE}, 0) - $1,
              ${bankCols.TOTAL_SENT} = COALESCE(${bankCols.TOTAL_SENT}, 0) + $1,
              ${bankCols.UPDATED_AT} = NOW()
          WHERE ${bankCols.ID} = $2;
        `;
        await client.query(updateBankQuery, [amountToDeduct, bankAccountId]);
      }

      const updateSummaryQuery = `
        INSERT INTO ${summaryTable} (
          ${summaryCols.MONTH_KEY}, 
          ${summaryCols.ESTIMATED_BANK_BALANCE}
        )
        VALUES ($1, -$2)
        ON CONFLICT (${summaryCols.MONTH_KEY}) 
        DO UPDATE SET 
          ${summaryCols.ESTIMATED_BANK_BALANCE} = COALESCE(${summaryTable}.${summaryCols.ESTIMATED_BANK_BALANCE}, 0) + EXCLUDED.${summaryCols.ESTIMATED_BANK_BALANCE},
          ${summaryCols.UPDATED_AT} = NOW();
      `;
      await client.query(updateSummaryQuery, [finalMonthKey, amountToDeduct]);

      await notifyFinanceMonthlyDelta({
        monthKey: finalMonthKey,
        bankBalanceDelta: -amountToDeduct,
        context: `webhook.outbound_transfer`,
        executor: client,
      });

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
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

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (bankAccountId) {
        const updateBankQuery = `
          UPDATE ${bankTable}
          SET ${bankCols.BALANCE} = COALESCE(${bankCols.BALANCE}, 0) - $1,
              ${bankCols.TOTAL_SENT} = COALESCE(${bankCols.TOTAL_SENT}, 0) + $1,
              ${bankCols.UPDATED_AT} = NOW()
          WHERE ${bankCols.ID} = $2;
        `;
        await client.query(updateBankQuery, [amountToDeduct, bankAccountId]);
      }

      const updateSummaryQuery = `
        INSERT INTO ${summaryTable} (
          ${summaryCols.MONTH_KEY}, 
          ${summaryCols.TOTAL_PROFIT},
          ${summaryCols.ESTIMATED_BANK_BALANCE}
        )
        VALUES ($1, -$2, -$2)
        ON CONFLICT (${summaryCols.MONTH_KEY}) 
        DO UPDATE SET 
          ${summaryCols.TOTAL_PROFIT} = COALESCE(${summaryTable}.${summaryCols.TOTAL_PROFIT}, 0) + EXCLUDED.${summaryCols.TOTAL_PROFIT},
          ${summaryCols.ESTIMATED_BANK_BALANCE} = COALESCE(${summaryTable}.${summaryCols.ESTIMATED_BANK_BALANCE}, 0) + EXCLUDED.${summaryCols.ESTIMATED_BANK_BALANCE},
          ${summaryCols.UPDATED_AT} = NOW();
      `;
      await client.query(updateSummaryQuery, [finalMonthKey, amountToDeduct]);

      await notifyFinanceMonthlyDelta({
        monthKey: finalMonthKey,
        profitDelta: -amountToDeduct,
        bankBalanceDelta: -amountToDeduct,
        context: `manualWebhook.incrementDashboardSummaryByDelta`,
        executor: client,
      });

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('[FinancialMetrics] Lỗi handleManualExpense', { error: error.message });
  }
}

/**
 * 6. Thanh toán NCC (Supplier Payment)
 * Công thức: Chỉ trừ tiền trong Bank (Cost đã được tính lúc thanh toán/gia hạn đơn)
 */
async function handleSupplierPayment(payload) {
  try {
    const { amount, supplierId, bankAccountId, monthKey } = payload;
    const amountToDeduct = Number(amount) || 0;
    if (amountToDeduct <= 0) return;

    logger.info(`[FinancialMetrics] Thanh toán NCC: Trừ Sổ Quỹ (Bank) -${amountToDeduct}`);
    const finalMonthKey = monthKey || new Date().toISOString().slice(0, 7);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (bankAccountId) {
        const updateBankQuery = `
          UPDATE ${bankTable}
          SET ${bankCols.BALANCE} = COALESCE(${bankCols.BALANCE}, 0) - $1,
              ${bankCols.TOTAL_SENT} = COALESCE(${bankCols.TOTAL_SENT}, 0) + $1,
              ${bankCols.UPDATED_AT} = NOW()
          WHERE ${bankCols.ID} = $2;
        `;
        await client.query(updateBankQuery, [amountToDeduct, bankAccountId]);
      }

      const updateSummaryQuery = `
        INSERT INTO ${summaryTable} (
          ${summaryCols.MONTH_KEY}, 
          ${summaryCols.ESTIMATED_BANK_BALANCE}
        )
        VALUES ($1, -$2)
        ON CONFLICT (${summaryCols.MONTH_KEY}) 
        DO UPDATE SET 
          ${summaryCols.ESTIMATED_BANK_BALANCE} = COALESCE(${summaryTable}.${summaryCols.ESTIMATED_BANK_BALANCE}, 0) + EXCLUDED.${summaryCols.ESTIMATED_BANK_BALANCE},
          ${summaryCols.UPDATED_AT} = NOW();
      `;
      await client.query(updateSummaryQuery, [finalMonthKey, amountToDeduct]);

      await notifyFinanceMonthlyDelta({
        monthKey: finalMonthKey,
        bankBalanceDelta: -amountToDeduct,
        context: `payments.confirmPaymentSupply`,
        executor: client,
      });

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('[FinancialMetrics] Lỗi handleSupplierPayment', { error: error.message });
  }
}

function registerFinancialMetricsSubscribers() {
  eventBus.on(EVENTS.SEPAY_MONEY_IN, handleOrderPaymentReceived);
  eventBus.on(EVENTS.ORDER_DELETED, handleOrderDeleted);
  eventBus.on(EVENTS.MONEY_WITHDRAWN, handleWithdrawal);
  eventBus.on(EVENTS.MANUAL_EXPENSE_CREATED, handleManualExpense);
  eventBus.on(EVENTS.SUPPLIER_PAID, handleSupplierPayment);
  logger.info('[FinancialMetricsSubscriber] Đã khởi tạo và gắn Event SEPAY_MONEY_IN, ORDER_DELETED, MONEY_WITHDRAWN, MANUAL_EXPENSE, SUPPLIER_PAID');
}

module.exports = {
  registerFinancialMetricsSubscribers,
  handleOrderPaymentReceived,
  handleOrderDeleted,
  handleWithdrawal,
  handleManualExpense,
  handleSupplierPayment
};
