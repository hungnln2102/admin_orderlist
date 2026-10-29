/**
 * orderPaymentService.js (V2)
 * Dịch vụ xử lý Thanh Toán & Gia Hạn Đơn Hàng - Dùng chung cho:
 *   1. Luồng tự động: Webhook SePay/Ngân Hàng
 *   2. Luồng thủ công: Admin phân bổ biên lai bằng tay
 *
 * Đảm bảo: Cập nhật trạng thái đơn, cộng ngày gia hạn, phát EventBus đều đi qua 1 điểm duy nhất.
 */
const { db, TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { eventBus, EVENTS } = require("@/events");
const { getVietnamDateString } = require("@/utils/time");
const { isMavrykSupplier } = require("@/domains/suppliers/utils/supplierCheck");

/**
 * Trích xuất số tháng (X) của gói từ biến thể sản phẩm (--xm) hoặc order.days.
 * Thứ tự ưu tiên:
 * 1. options.months truyền vào
 * 2. Regex (?:--|—|-)(\d+)m từ display_name, variant_name, id_product, information_order...
 * 3. Query bảng business.variant nếu id_product là số
 * 4. Fallback theo số ngày (days) lưu trong order (365 -> 12, 180 -> 6, 90 -> 3, 30 -> 1)
 */
async function resolveMonthsToAdd(order, options = {}) {
  if (options.months && Number(options.months) > 0) {
    return Number(options.months);
  }

  // 1. Kiểm tra chuỗi text có sẵn trên order
  const localTexts = [
    order?.display_name,
    order?.variant_name,
    order?.id_product,
    order?.information_order,
    order?.slot,
    order?.note,
  ]
    .filter(Boolean)
    .map(String)
    .join(" ");

  const matchLocalM =
    localTexts.match(/(?:--|—|-)(\d+)m\b/i) ||
    localTexts.match(/(\d+)\s*(?:tháng|month)/i);
  if (matchLocalM && Number(matchLocalM[1]) > 0) {
    return Number(matchLocalM[1]);
  }

  const matchLocalY =
    localTexts.match(/(?:--|—|-)(\d+)y\b/i) ||
    localTexts.match(/(\d+)\s*(?:năm|year)/i);
  if (matchLocalY && Number(matchLocalY[1]) > 0) {
    return Number(matchLocalY[1]) * 12;
  }

  // 2. Nếu id_product là ID biến thể và chưa có display_name, tra cứu trực tiếp bảng variant
  const pId = Number(order?.id_product);
  const queryDb = options.trx || db;
  if (!isNaN(pId) && pId > 0 && queryDb) {
    try {
      const variant = await queryDb(TABLES.VARIANT)
        .where({ id: pId })
        .select("display_name", "variant_name")
        .first();
      if (variant) {
        const vText = `${variant.display_name || ""} ${variant.variant_name || ""}`;
        const matchM =
          vText.match(/(?:--|—|-)(\d+)m\b/i) ||
          vText.match(/(\d+)\s*(?:tháng|month)/i);
        if (matchM && Number(matchM[1]) > 0) return Number(matchM[1]);
        const matchY =
          vText.match(/(?:--|—|-)(\d+)y\b/i) ||
          vText.match(/(\d+)\s*(?:năm|year)/i);
        if (matchY && Number(matchY[1]) > 0) return Number(matchY[1]) * 12;
      }
    } catch {
      // Query lỗi -> tiếp tục fallback
    }
  }

  // 3. Fallback theo số ngày (days) đã lưu trong order
  const days = Number(options.days || order?.days || 0);
  if (days >= 350 && days <= 375) return 12;
  if (days >= 170 && days <= 190) return 6;
  if (days >= 80 && days <= 100) return 3;
  if (days >= 50 && days <= 70) return 2;
  if (days >= 25 && days <= 35) return 1;
  if (days > 0) return Math.max(1, Math.round(days / 30));

  return 1; // Mặc định 1 tháng
}

/**
 * Kiểm tra đơn hàng có phải đang ở trạng thái Gia Hạn (Renewal) hay không.
 * Hỗ trợ cả V1 (string tiếng Việt) và V2 (enum chuẩn).
 * @param {string} status - Trạng thái hiện tại của đơn hàng
 * @returns {boolean}
 */
function isRenewalOrder(status) {
  if (!status) return false;
  const normalized = String(status).trim().toUpperCase();
  return (
    normalized === ORDER_STATUS.RENEW_REQUIRED ||
    normalized.includes("GIA HẠN") ||
    normalized.includes("GIA HAN")
  );
}

/**
 * Tính ngày bắt đầu mới và ngày hết hạn mới khi gia hạn đơn hàng.
 * Chuẩn hóa theo chỉ đạo của Master:
 * - Ngày bắt đầu mới = Ngày hết hạn hiện tại + 1 ngày
 * - Ngày hết hạn mới = Tháng hiện tại + X tháng (theo gói --xm), ngày (day) giữ nguyên như cũ
 *
 * @param {object|string|Date} orderOrExpiry - Đối tượng order (hoặc chuỗi expired_at)
 * @param {object|number} [optionsOrDays={}] - Options bổ sung (trx, months, days) hoặc số ngày
 * @returns {Promise<{newOrderDate: string, newExpiredAt: string, days: number, monthsAdded: number} & string>}
 */
async function calculateNewExpiry(orderOrExpiry, optionsOrDays = {}) {
  let order = {};
  let options = {};

  if (typeof orderOrExpiry === "string" || orderOrExpiry instanceof Date) {
    order = { expired_at: orderOrExpiry };
    if (typeof optionsOrDays === "number") {
      options = { days: optionsOrDays };
    } else if (optionsOrDays && typeof optionsOrDays === "object") {
      options = optionsOrDays;
    }
  } else if (orderOrExpiry && typeof orderOrExpiry === "object") {
    order = orderOrExpiry;
    if (typeof optionsOrDays === "number") {
      options = { days: optionsOrDays };
    } else if (optionsOrDays && typeof optionsOrDays === "object") {
      options = optionsOrDays;
    }
  }

  const monthsToAdd = await resolveMonthsToAdd(order, options);
  const baseExpiredAt = order?.expired_at || options.currentExpiredAt;

  // Lấy chuỗi YYYY-MM-DD theo giờ Việt Nam
  const expStr = getVietnamDateString(baseExpiredAt || new Date());
  const [y, m, d] = expStr.split("-").map(Number);

  // 1. Ngày bắt đầu mới = expired_at + 1 ngày
  const nextStartUtc = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  const newOrderDate = nextStartUtc.toISOString().slice(0, 10);

  // 2. Ngày hết hạn mới = cộng monthsToAdd, giữ nguyên ngày d cũ
  const totalMonths = m - 1 + monthsToAdd;
  const newYear = y + Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;

  // Chốt an toàn ngày tối đa của tháng đích (VD: 31/01 -> 28/02)
  const maxDaysInTargetMonth = new Date(Date.UTC(newYear, newMonth, 0)).getUTCDate();
  const targetDay = Math.min(d, maxDaysInTargetMonth);

  const pad = (n) => String(n).padStart(2, "0");
  const newExpiredAt = `${newYear}-${pad(newMonth)}-${pad(targetDay)}`;

  // 3. Tính số ngày thực tế giữa chu kỳ mới để lưu cột days
  const startObj = new Date(
    Date.UTC(
      nextStartUtc.getUTCFullYear(),
      nextStartUtc.getUTCMonth(),
      nextStartUtc.getUTCDate()
    )
  );
  const endObj = new Date(Date.UTC(newYear, newMonth - 1, targetDay));
  const newDays = Math.max(
    1,
    Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const result = {
    newOrderDate,
    newExpiredAt,
    days: newDays,
    monthsAdded: monthsToAdd,
    toString() {
      return newExpiredAt;
    },
  };

  return result;
}

/**
 * Xử lý cập nhật Đơn hàng khi nhận thanh toán thành công.
 * Cập nhật trạng thái sang PAID, cộng ngày gia hạn (nếu có), và bắn EventBus.
 *
 * @param {import('knex').Knex.Transaction} trx - Knex transaction đang mở
 * @param {object} order - Bản ghi đơn hàng gốc từ DB (bắt buộc có id, id_order, status, days, expired_at)
 * @param {number} amount - Số tiền thanh toán
 * @param {object} options
 * @param {number} options.receiptId - ID biên lai đi kèm
 * @param {string} [options.action] - Nhãn hành động (VD: "WEBHOOK_PAYMENT_MATCH", "ADMIN_MANUAL_ALLOCATE")
 * @returns {Promise<{updatedOrder: object, isRenewal: boolean, newExpiredAt: string|null, newOrderDate: string|null}>}
 */
async function processOrderPayment(trx, order, amount, options = {}) {
  const { receiptId, action = "PAYMENT_RECEIVED" } = options;

  if (
    ![
      ORDER_STATUS.UNPAID,
      ORDER_STATUS.RENEW_REQUIRED,
      ORDER_STATUS.PROCESSING,
    ].includes(order.status)
  ) {
    throw new Error(
      `Đơn hàng ${order.id_order} đang ở trạng thái ${order.status}, không thể ghi nhận thanh toán.`
    );
  }

  const isRenewal = isRenewalOrder(order.status);

  // Xây dựng object update
  const updateFields = {
    status: ORDER_STATUS.PAID,
    was_paid: true,
  };

  let newExpiredAt = null;
  let newOrderDate = null;
  let newDays = Number(order.days || 365);
  let monthsAdded = 1;

  if (isRenewal) {
    const renewal = await calculateNewExpiry(order, { trx });
    newOrderDate = renewal.newOrderDate;
    newExpiredAt = renewal.newExpiredAt;
    newDays = renewal.days;
    monthsAdded = renewal.monthsAdded;

    updateFields.order_date = newOrderDate;
    updateFields.expired_at = newExpiredAt;
    updateFields.days = newDays;
  }

  // Cập nhật Đơn hàng trong transaction
  const [updatedOrder] = await trx(TABLES.ORDER_LIST)
    .where({ id: order.id })
    .update(updateFields)
    .returning("*");

  // Kiểm tra xem NCC có phải là Mavryk (Chủ shop) hay không.
  // Nếu là Mavryk -> Không phát sinh chi phí nhập NCC, không tạo công nợ NCC.
  const isSupplierMavryk = await isMavrykSupplier(trx, order);
  const effectiveCost = isSupplierMavryk ? 0 : Number(order.cost || 0);
  const supplyId = order.supply_id ? Number(order.supply_id) : null;

  // Ghi nhận chi phí nhập NCC khi gia hạn thành công (chu kỳ mới, chỉ áp dụng cho NCC ngoài)
  let supplierCostInserted = false;
  if (isRenewal && !isSupplierMavryk && effectiveCost > 0 && supplyId) {
    await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
      order_list_id: updatedOrder.id,
      supply_id: supplyId,
      id_order: updatedOrder.id_order,
      import_cost: effectiveCost,
      refund_amount: 0,
      ncc_payment_status: "Chưa Thanh Toán",
      logged_at: trx.fn.now(),
    });
    supplierCostInserted = true;
  }

  trx.afterCommit(() => {
    eventBus.emit(EVENTS.ORDER_PAID, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      amount,
      cost: effectiveCost,
      isSupplierMavryk,
      supply_id: supplyId,
      status: updatedOrder.status,
      receiptId,
      isRenewal,
      action,
    });

    if (isRenewal) {
      eventBus.emit(EVENTS.ORDER_RENEWED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        newOrderDate: updatedOrder.order_date,
        newExpiredAt: updatedOrder.expired_at,
        daysAdded: newDays,
        monthsAdded,
        receiptId,
        action,
        productName:
          updatedOrder.product_name ||
          updatedOrder.package_name ||
          updatedOrder.id_product,
        slot: updatedOrder.slot,
        information_order: updatedOrder.information_order,
        price: amount,
        cost: effectiveCost,
        isSupplierMavryk,
      });

      if (supplierCostInserted) {
        eventBus.emit(EVENTS.SUPPLIER_COST_ADDED, {
          cost: effectiveCost,
          supplier_id: supplyId,
          order_id: updatedOrder.id,
          id_order: updatedOrder.id_order,
          summary: `Thêm chi phí gia hạn nhập hàng cho đơn #${updatedOrder.id_order}: ${effectiveCost} ₫`,
        });
      }
    }
  });

  // Tự động đối soát và loại trừ đơn hàng khỏi các đợt gộp PENDING còn hiệu lực (nếu có)
  try {
    const { excludeOrderFromPendingBatches } = require("@/domains/invoices/services/batchPaymentService");
    await excludeOrderFromPendingBatches(trx, updatedOrder.id_order, "Đã thanh toán");
  } catch (exErr) {
    console.warn(`[OrderPayment] Bỏ qua loại trừ batch cho đơn ${updatedOrder.id_order}:`, exErr.message);
  }

  return { updatedOrder, isRenewal, newExpiredAt, newOrderDate };
}

module.exports = {
  processOrderPayment,
  isRenewalOrder,
  calculateNewExpiry,
  resolveMonthsToAdd,
};
