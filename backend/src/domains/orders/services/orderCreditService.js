const { db, TABLES, withTransaction } = require("@/db");
const { publishEventInTrx, EVENTS } = require("@/events");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { isRenewalOrder, calculateNewExpiry } = require("./orderPaymentService");
const { isMavrykSupplier } = require("@/domains/suppliers/utils/supplierCheck");
const { getDefaultShopBank } = require("./orderQueryService");
const { buildVietQrImageUrl } = require("@/utils/qrUrl");

const getOrderTable = (trx) => (trx || db)(TABLES.ORDER_LIST);

async function emitOrderEvent(trx, eventName, payload) {
  const aggregateId = payload.orderId || payload.order_id || payload.id || payload.id_order || "";
  const aggregateType = eventName.startsWith("WAREHOUSE_")
    ? "WAREHOUSE"
    : eventName.startsWith("SUPPLIER_")
      ? "SUPPLIER"
      : "ORDER";

  return publishEventInTrx(trx, {
    eventName,
    aggregateType,
    aggregateId,
    action: payload.action || eventName,
    beforeState: payload.old_values || payload.beforeState || null,
    afterState: payload.new_values || payload.afterState || (eventName === EVENTS.ORDER_CREATED ? payload : null),
    changedFields: payload.changes || payload.changed_fields || {},
    source: "ORDER_SERVICE",
    payload,
  });
}

/**
 * Tính số tiền còn lại của đơn hàng dựa trên thời gian sử dụng
 */
function calculateOrderRemainingValue(order, baseAmount) {
  if (!order) return 0;
  const cost = baseAmount != null ? Number(baseAmount) || 0 : Number(order.cost || order.price || 0);
  if (cost <= 0) return 0;
  if (!order.expired_at) return cost;

  const expiry = new Date(order.expired_at);
  if (isNaN(expiry.getTime())) return cost;
  expiry.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const remainingDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  if (remainingDays <= 0) return 0;

  const totalDays = Math.max(Number(order.days || 365), 1);
  return Math.min(cost, Math.max(0, Math.round((cost / totalDays) * remainingDays)));
}

async function payOrderWithCredit(id, creditNoteId) {
  return await withTransaction(async (trx) => {
    const order = await getOrderTable(trx).where({ id: Number(id) }).forUpdate().first();
    if (!order) throw new Error("Không tìm thấy đơn hàng.");

    const creditNote = await trx(TABLES.REFUND_CREDIT_NOTES).where({ id: Number(creditNoteId) }).forUpdate().first();
    if (!creditNote) throw new Error("Không tìm thấy mã credit.");

    const orderPrice = Number(order.price || 0);
    const alreadyApplied = Number(order.credit_paid_amount || 0);
    const remainingAmount = Math.max(0, orderPrice - alreadyApplied);
    const availableAmount = Number(creditNote.available_amount || 0);

    if (![ORDER_STATUS.UNPAID, ORDER_STATUS.RENEW_REQUIRED].includes(order.status)) {
      throw new Error("Chỉ đơn chưa thanh toán hoặc cần gia hạn mới có thể thanh toán bằng credit.");
    }

    if (!['OPEN', 'PARTIALLY_APPLIED'].includes(creditNote.status)) {
      throw new Error("Credit không còn hiệu lực để thanh toán.");
    }

    if (orderPrice <= 0) {
      throw new Error("Số tiền đơn hàng phải lớn hơn 0 để thanh toán bằng credit.");
    }

    if (remainingAmount <= 0) {
      throw new Error("Đơn hàng đã đủ số tiền Credit trước đó.");
    }

    const appliedAmount = Math.min(availableAmount, remainingAmount);
    if (appliedAmount <= 0) {
      throw new Error("Credit không còn số dư khả dụng.");
    }

    await trx(TABLES.REFUND_CREDIT_APPLICATIONS).insert({
      credit_note_id: creditNote.id,
      target_order_list_id: order.id,
      target_order_code: order.id_order,
      applied_amount: appliedAmount,
      note: `Thanh toán đơn #${order.id_order} bằng credit ${creditNote.credit_code}`,
      applied_by: 'ADMIN',
    });

    const newAvailable = availableAmount - appliedAmount;
    const newStatus = newAvailable <= 0 ? 'FULLY_APPLIED' : 'PARTIALLY_APPLIED';
    await trx(TABLES.REFUND_CREDIT_NOTES)
      .where({ id: creditNote.id })
      .update({
        available_amount: newAvailable,
        status: newStatus,
        updated_at: db.fn.now(),
      });

    const isRenewal = isRenewalOrder(order.status);
    const totalCreditPaid = alreadyApplied + appliedAmount;
    const isFullyPaid = appliedAmount >= remainingAmount;
    const updateFields = {
      status: isFullyPaid ? ORDER_STATUS.PAID : order.status,
      payment_method: isFullyPaid ? "credit" : "credit_partial",
      credit_paid_amount: totalCreditPaid,
    };

    if (isRenewal) {
      const renewal = await calculateNewExpiry(order, { trx });
      updateFields.order_date = renewal.newOrderDate;
      updateFields.expired_at = renewal.newExpiredAt;
      updateFields.days = renewal.days;
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: order.id })
      .update(updateFields)
      .returning("*");


    if (!isFullyPaid) {
      const defaultBank = await getDefaultShopBank(trx);
      const remainingToPay = Math.max(0, remainingAmount - appliedAmount);
      const bankAccount = defaultBank?.account_number || defaultBank?.accountNumber;
      const bankCode = defaultBank?.bank_bin || defaultBank?.bankBin || defaultBank?.bank_short_code || defaultBank?.bankShortCode;
      const qrUrl = bankAccount && bankCode
        ? buildVietQrImageUrl({
          bankCode,
          accountNumber: bankAccount,
          amount: remainingToPay,
          accountName: defaultBank.account_holder || defaultBank.accountHolder || "",
          addInfo: updatedOrder.id_order,
        })
        : "";
      return {
        ...updatedOrder,
        success: true,
        partial: true,
        appliedAmount,
        remainingAmount: remainingToPay,
        vietqr_url: qrUrl,
      };
    }
    const isSupplierMavryk = await isMavrykSupplier(trx, updatedOrder);
    const existingLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ order_list_id: updatedOrder.id })
      .first();
    const importCost = Number(updatedOrder.cost || 0);
    if (!isSupplierMavryk && !existingLog && importCost > 0) {
      let supplyId = updatedOrder.supply_id ? Number(updatedOrder.supply_id) : null;
      if (!supplyId) {
        const defaultSupplier = await trx(TABLES.SUPPLIER).orderBy("id", "asc").first();
        supplyId = defaultSupplier ? defaultSupplier.id : 1;
      }
      await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
        order_list_id: updatedOrder.id,
        supply_id: supplyId,
        id_order: updatedOrder.id_order,
        import_cost: importCost,
        ncc_payment_status: 'Chưa Thanh Toán',
        logged_at: db.fn.now(),
      });

      await emitOrderEvent(trx, EVENTS.SUPPLIER_COST_ADDED, {
        cost: importCost,
        supplier_id: updatedOrder.supply_id,
        summary: `Thêm chi phí nhập hàng cho đơn #${updatedOrder.id_order} thanh toán bằng credit: ${importCost} ₫`,
      });
    }

    return updatedOrder;
  });
}

module.exports = {
  payOrderWithCredit,
  calculateOrderRemainingValue,
};

