/**
 * dailySummaryService.js (V2)
 * Event-driven service to accumulate data into daily_revenue_summary in real-time.
 */

const { db, TABLES } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { financeNotifier } = require("@/domains/notifications/telegram");
const { getVietnamDateString, getVietnamMonthString } = require("@/utils/time");
const { isMavrykSupplier } = require("@/domains/suppliers/utils/supplierCheck");

/**
 * Hàm tích lũy số liệu vào daily_revenue_summary theo ngày (Event-driven, chuẩn UTC+7)
 */
async function accumulateDailySummary(dateStr, fields = {}) {
  const date = getVietnamDateString(dateStr);

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
 * và phát thông báo Telegram đồng bộ sau khi đã ghi dữ liệu vào CSDL.
 */
function registerDailySummaryListeners() {
  // 1. Đơn hàng thanh toán thành công hoặc gia hạn thành công -> Cộng doanh thu + 1 đơn
  eventBus.on(EVENTS.ORDER_PAID, async (data) => {
    try {
      const amount = Number(data.amount || data.price || data.gross_selling_price || 0);
      
      // Kiểm tra nếu NCC là Mavryk (Chủ shop) -> Chi phí nhập hàng = 0, cộng thẳng vào lợi nhuận
      let isMavryk = Boolean(data.isSupplierMavryk);
      if (!isMavryk && (data.id_order || data.supply_id || data.orderId)) {
        isMavryk = await isMavrykSupplier(db, {
          id: data.orderId,
          id_order: data.id_order,
          supply_id: data.supply_id,
          supplier_name: data.supplier_name,
          supply: data.supply,
        });
      }

      const cost = isMavryk ? 0 : Number(data.cost || 0);
      const dateStr = getVietnamDateString(data.order_date || data.transactionDate || data.updated_at);
      const isRenewal = Boolean(data.isRenewal);
      console.log(`📊 [DailySummary] Nhận ORDER_PAID (${isRenewal ? "Gia hạn" : "Đơn mới"}${isMavryk ? " - NCC Mavryk (Chủ shop)" : ""}): +${amount} ₫ doanh thu, +${cost} ₫ chi phí, +1 đơn (Ngày: ${dateStr})`);

      await accumulateDailySummary(dateStr, {
        earned_revenue: amount,
        total_shop_cost: cost,
        dashboard_orders_count: 1,
      });

      // Sau khi DB đã cập nhật xong -> Bắn thông báo Telegram Biến Động Tháng
      const isWebhook = data.action === "WEBHOOK_PAYMENT_MATCH";
      const context = isWebhook
        ? (isRenewal ? `webhook.orderRenewed:${data.id_order}` : `webhook.orderPaid:${data.id_order}`)
        : (isRenewal ? `renewal.orderRenewed:${data.id_order}` : `order.completed:${data.id_order}`);
      const bankDelta = isWebhook ? amount : 0;

      await financeNotifier.notifyFinanceMonthlyDelta({
        monthKey: getVietnamMonthString(dateStr),
        revenueDelta: amount,
        importDelta: cost, // 0 nếu là Mavryk -> Nhập hàng không tăng!
        profitDelta: amount - cost, // = amount nếu là Mavryk -> Cộng thẳng toàn bộ doanh thu vào lợi nhuận!
        bankBalanceDelta: bankDelta,
        context,
      });
    } catch (err) {
      console.error("[DailySummary] Lỗi xử lý ORDER_PAID:", err.message);
    }
  });

  // 2. Event gia hạn đơn hàng (ORDER_RENEWED)
  // Doanh thu, chi phí và số lượng đơn của đơn gia hạn đã được hạch toán đầy đủ tại ORDER_PAID.
  // Listener ở đây chỉ log thông tin vòng đời gia hạn, tránh cộng trùng lặp số lượng đơn.
  eventBus.on(EVENTS.ORDER_RENEWED, async (data) => {
    console.log(`🔄 [DailySummary] Nhận ORDER_RENEWED: đơn #${data.id_order} gia hạn +${data.daysAdded} ngày (Hết hạn mới: ${data.newExpiredAt})`);
  });

  // 3. Thanh toán công nợ NCC -> Tăng chi phí nhập hàng
  eventBus.on(EVENTS.SUPPLIER_DEBT_PAID, async (data) => {
    try {
      const amount = Number(data.amount || 0);
      const date = getVietnamDateString();
      console.log(`📊 [DailySummary] Nhận SUPPLIER_DEBT_PAID: +${amount} ₫ tiền thanh toán NCC (Ngày: ${date})`);

      await accumulateDailySummary(date, {
        total_shop_cost: amount,
      });

      await financeNotifier.notifyFinanceMonthlyDelta({
        monthKey: getVietnamMonthString(date),
        importDelta: amount,
        bankBalanceDelta: -amount,
        context: data.summary || `Thanh toán công nợ NCC ${data.supplier_name}: ${amount} đ`,
      });
    } catch (err) {
      console.error("[DailySummary] Lỗi xử lý SUPPLIER_DEBT_PAID:", err.message);
    }
  });

  // 4. Tiền hoàn / Đơn hủy -> Cộng hoàn tiền + 1 đơn hủy
  eventBus.on(EVENTS.ORDER_CANCELED_REFUNDED, async (data) => {
    try {
      const refundAmount = Number(data.refund || data.refundAmount || data.amount || 0);
      const date = getVietnamDateString();
      console.log(`📊 [DailySummary] Nhận ORDER_CANCELED_REFUNDED: +${refundAmount} ₫ hoàn tiền, +1 đơn hủy (Ngày: ${date})`);

      await accumulateDailySummary(date, {
        revenue_reversed: refundAmount,
        dashboard_canceled_count: 1,
      });

      await financeNotifier.notifyFinanceMonthlyDelta({
        monthKey: getVietnamMonthString(date),
        refundDelta: refundAmount,
        revenueDelta: 0,
        profitDelta: -refundAmount,
        bankBalanceDelta: 0,
        context: `order.canceledRefunded:${data.orderCode || data.id_order}`,
      });
    } catch (err) {
      console.error("[DailySummary] Lỗi xử lý ORDER_CANCELED_REFUNDED:", err.message);
    }
  });

  // 5. Đơn nhập hàng mới thành công -> Tăng chi phí nhập hàng, giảm lợi nhuận đúng bằng số tiền nhập (chỉ áp dụng nếu NCC không phải Mavryk)
  eventBus.on(EVENTS.ORDER_IMPORT_CREATED, async (data) => {
    try {
      let isMavryk = Boolean(data.isSupplierMavryk);
      if (!isMavryk && (data.id_order || data.supply_id || data.orderId)) {
        isMavryk = await isMavrykSupplier(db, {
          id: data.orderId,
          id_order: data.id_order,
          supply_id: data.supply_id,
          supplier_name: data.supplier_name,
          supply: data.supply,
        });
      }
      if (isMavryk) {
        console.log(`📦 [DailySummary] Đơn nhập hàng #${data.id_order} thuộc chủ shop Mavryk -> Bỏ qua cộng chi phí nhập hàng.`);
        return;
      }

      const cost = Number(data.cost || data.amount || 0);
      if (cost <= 0) return;
      const date = getVietnamDateString(data.order_date || data.created_at);
      console.log(`📦 [DailySummary] Nhận ORDER_IMPORT_CREATED: +${cost} ₫ chi phí nhập hàng (Đơn #${data.id_order}, Ngày: ${date})`);

      await accumulateDailySummary(date, {
        total_shop_cost: cost,
      });

      await financeNotifier.notifyFinanceMonthlyDelta({
        monthKey: getVietnamMonthString(date),
        importDelta: cost,
        profitDelta: -cost,
        context: `order.importCreated:${data.id_order || data.orderCode}`,
      });
    } catch (err) {
      console.error("[DailySummary] Lỗi xử lý ORDER_IMPORT_CREATED:", err.message);
    }
  });

  // 6. Hủy / Xóa đơn nhập hàng thành công -> Giảm chi phí nhập hàng, cộng lại lợi nhuận đúng bằng số tiền còn lại
  eventBus.on(EVENTS.ORDER_IMPORT_CANCELED, async (data) => {
    try {
      let isMavryk = Boolean(data.isSupplierMavryk);
      if (!isMavryk && (data.id_order || data.supply_id || data.orderId)) {
        isMavryk = await isMavrykSupplier(db, {
          id: data.orderId,
          id_order: data.id_order,
          supply_id: data.supply_id,
          supplier_name: data.supplier_name,
          supply: data.supply,
        });
      }
      if (isMavryk) {
        console.log(`📦 [DailySummary] Hủy đơn nhập hàng #${data.id_order} thuộc chủ shop Mavryk -> Bỏ qua trừ chi phí.`);
        return;
      }

      const remainingAmount = Number(data.remainingAmount ?? data.amount ?? data.cost ?? 0);
      if (remainingAmount <= 0) return;
      const date = getVietnamDateString();
      console.log(`📦 [DailySummary] Nhận ORDER_IMPORT_CANCELED: -${remainingAmount} ₫ chi phí nhập hoàn trả (Đơn #${data.id_order}, Ngày: ${date})`);

      await accumulateDailySummary(date, {
        total_shop_cost: -remainingAmount,
      });

      await financeNotifier.notifyFinanceMonthlyDelta({
        monthKey: getVietnamMonthString(date),
        importDelta: -remainingAmount,
        profitDelta: remainingAmount,
        context: `order.importCanceled:${data.id_order || data.orderCode}`,
      });
    } catch (err) {
      console.error("[DailySummary] Lỗi xử lý ORDER_IMPORT_CANCELED:", err.message);
    }
  });

  eventBus.on(EVENTS.ORDER_PENDING_REFUND, async (data) => {
    try {
      const date = getVietnamDateString();
      console.log(`📊 [DailySummary] Nhận ORDER_PENDING_REFUND: +1 đơn hủy`);
      await accumulateDailySummary(date, {
        dashboard_canceled_count: 1,
      });
    } catch (err) {
      console.error("[DailySummary] Lỗi xử lý ORDER_PENDING_REFUND:", err.message);
    }
  });

  console.log("✅ [DailySummary] Event-driven listeners registered successfully (UTC+7).");
}

module.exports = {
  accumulateDailySummary,
  registerDailySummaryListeners,
};
