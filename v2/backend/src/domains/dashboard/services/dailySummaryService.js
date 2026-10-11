/**
 * dailySummaryService.js (V2)
 * Event-driven service to accumulate data into daily_revenue_summary in real-time.
 */

const { db, TABLES } = require("@/db");
const { eventBus, EVENTS } = require("@/events");

/**
 * Hàm tích lũy số liệu vào daily_revenue_summary theo ngày (Event-driven)
 */
async function accumulateDailySummary(dateStr, fields = {}) {
  const date = dateStr ? String(dateStr).slice(0, 10) : new Date().toISOString().slice(0, 10);

  const existing = await db(TABLES.DAILY_REVENUE_SUMMARY)
    .where("summary_date", date)
    .first();

  const addRev = Number(fields.earned_revenue || 0);
  const addCost = Number(fields.total_shop_cost || 0);
  const addRefund = Number(fields.revenue_reversed || 0);
  const addOrders = Number(fields.dashboard_orders_count || 0);
  const addCanceled = Number(fields.dashboard_canceled_count || 0);

  if (!existing) {
    await db(TABLES.DAILY_REVENUE_SUMMARY).insert({
      summary_date: date,
      earned_revenue: addRev,
      total_shop_cost: addCost,
      revenue_reversed: addRefund,
      dashboard_orders_count: addOrders,
      dashboard_canceled_count: addCanceled,
    });
  } else {
    await db(TABLES.DAILY_REVENUE_SUMMARY)
      .where("summary_date", date)
      .update({
        earned_revenue: db.raw("COALESCE(earned_revenue, 0) + ?", [addRev]),
        total_shop_cost: db.raw("COALESCE(total_shop_cost, 0) + ?", [addCost]),
        revenue_reversed: db.raw("COALESCE(revenue_reversed, 0) + ?", [addRefund]),
        dashboard_orders_count: db.raw("COALESCE(dashboard_orders_count, 0) + ?", [addOrders]),
        dashboard_canceled_count: db.raw("COALESCE(dashboard_canceled_count, 0) + ?", [addCanceled]),
      });
  }
}

/**
 * Đăng ký lắng nghe EventBus để cập nhật real-time vào daily_revenue_summary
 */
function registerDailySummaryListeners() {
  // 1. Đơn hàng thanh toán thành công hoặc gia hạn thành công -> Cộng doanh thu + 1 đơn
  eventBus.on(EVENTS.ORDER_PAID, async (data) => {
    const amount = Number(data.amount || data.price || data.gross_selling_price || 0);
    const cost = Number(data.cost || 0);
    const rawDate = data.order_date || data.transactionDate || data.updated_at || new Date();
    const dateStr = new Date(rawDate).toISOString().slice(0, 10);
    console.log(`📊 [DailySummary] Nhận ORDER_PAID: +${amount} ₫ doanh thu, +${cost} ₫ chi phí, +1 đơn (Ngày: ${dateStr})`);
    await accumulateDailySummary(dateStr, {
      earned_revenue: amount,
      total_shop_cost: cost,
      dashboard_orders_count: 1,
    });
  });

  eventBus.on(EVENTS.ORDER_RENEWED, async (data) => {
    const amount = Number(data.price || data.amount || data.gross_selling_price || 0);
    const dateStr = String(data.transactionDate || data.updated_at || new Date().toISOString()).slice(0, 10);
    console.log(`📊 [DailySummary] Nhận ORDER_RENEWED: +${amount} ₫ doanh thu gia hạn, +1 đơn (Ngày: ${dateStr})`);
    await accumulateDailySummary(dateStr, {
      earned_revenue: amount,
      dashboard_orders_count: 1,
    });
  });



  eventBus.on(EVENTS.SUPPLIER_DEBT_PAID, async (data) => {
    const amount = Number(data.amount || 0);
    const date = new Date().toISOString().slice(0, 10);
    console.log(`📊 [DailySummary] Nhận SUPPLIER_DEBT_PAID: +${amount} ₫ tiền thanh toán NCC`);
    await accumulateDailySummary(date, {
      total_shop_cost: amount,
    });
  });

  // 3. Tiền hoàn / Đơn hủy -> Cộng hoàn tiền + 1 đơn hủy
  eventBus.on(EVENTS.ORDER_CANCELED_REFUNDED, async (data) => {
    const refundAmount = Number(data.refund || data.amount || 0);
    const date = new Date().toISOString().slice(0, 10);
    console.log(`📊 [DailySummary] Nhận ORDER_CANCELED_REFUNDED: +${refundAmount} ₫ hoàn tiền, +1 đơn hủy`);
    await accumulateDailySummary(date, {
      revenue_reversed: refundAmount,
      dashboard_canceled_count: 1,
    });
  });

  eventBus.on(EVENTS.ORDER_PENDING_REFUND, async (data) => {
    const date = new Date().toISOString().slice(0, 10);
    console.log(`📊 [DailySummary] Nhận ORDER_PENDING_REFUND: +1 đơn hủy`);
    await accumulateDailySummary(date, {
      dashboard_canceled_count: 1,
    });
  });

  console.log("✅ [DailySummary] Event-driven listeners registered successfully.");
}

module.exports = {
  accumulateDailySummary,
  registerDailySummaryListeners,
};
