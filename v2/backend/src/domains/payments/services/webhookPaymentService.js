const { db, TABLES } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { ORDER_STATUS } = require("@/constants/orderStatus");

const getOrderTable = (trx = db) => trx(TABLES.ORDER_LIST);
const getReceiptTable = (trx = db) => trx(TABLES.PAYMENT_RECEIPT);
const getAllocationsTable = (trx = db) => trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS);

/**
 * Xử lý Webhook SePay / Ngân Hàng:
 * 1. Kiểm tra Idempotency (Chống trùng lặp theo sepay_transaction_id).
 * 2. Lưu thông tin vào bảng Biên lai (payment_receipt).
 * 3. Nếu là Tiền vào (in): Tìm đơn hàng khớp số tiền / mã đơn.
 *    - NẾU KHỚP: Cập nhật Biên lai -> FULLY_ALLOCATED, tạo bản ghi payment_receipt_allocations, đổi trạng thái Đơn hàng sang PAID (hoặc gia hạn).
 *    - NẾU KHÔNG KHỚP: Giữ nguyên Biên lai ở trạng thái UNALLOCATED (Biên lai chưa phân bổ / chưa liệt kê).
 * 4. Nếu là Tiền ra (out): Lưu Biên lai tiền ra.
 */
async function processPaymentWebhook(payload = {}) {
  const rawAmount = payload.transferAmount ?? payload.amount ?? payload.accumulatedAmount ?? payload.price ?? 0;
  const transferAmount = Math.round(Math.abs(Number(rawAmount)));

  if (!transferAmount || transferAmount <= 0) {
    return {
      success: false,
      matched: false,
      reason: "Số tiền chuyển khoản không hợp lệ (<= 0)",
    };
  }

  const rawTransferType = String(
    payload.transferType || payload.transfer_type || (Number(rawAmount) < 0 ? "out" : "in")
  ).toLowerCase();
  const isOutbound = rawTransferType === "out" || Number(rawAmount) < 0;

  const rawSepayTxId = payload.id || payload.sepay_transaction_id || payload.transactionId || null;
  const numSepayTxId = (rawSepayTxId && !isNaN(Number(rawSepayTxId))) ? String(rawSepayTxId).trim() : null;
  const referenceCode = payload.referenceCode || payload.code || (!numSepayTxId && rawSepayTxId ? String(rawSepayTxId) : null);
  const gateway = payload.gateway || payload.bankBrandName || "SEPAY";
  const noteContent = payload.content || payload.transactionContent || payload.note || "";
  const paymentDate = payload.transactionDate || payload.payment_date || new Date().toISOString().split("T")[0];

  // 1. Kiểm tra trùng lặp (Idempotency check)
  if (numSepayTxId) {
    const existing = await getReceiptTable()
      .where("sepay_transaction_id", numSepayTxId)
      .first();

    if (existing) {
      console.log(`ℹ️ [Webhook] Giao dịch sepay_transaction_id: ${numSepayTxId} đã tồn tại trong Biên lai #${existing.id}`);
      return {
        success: true,
        duplicate: true,
        receiptId: existing.id,
        matched: existing.status === "FULLY_ALLOCATED",
        amount: transferAmount,
        status: existing.status,
      };
    }
  }

  // Execute in DB Transaction
  return await db.transaction(async (trx) => {
    // 2. Tạo Biên lai mới (payment_receipt)
    const initialStatus = "UNALLOCATED";
    const initialUnallocated = isOutbound ? 0 : transferAmount;

    const [receiptIdRes] = await getReceiptTable(trx)
      .insert({
        payment_date: paymentDate,
        amount: transferAmount,
        unallocated_amount: initialUnallocated,
        status: initialStatus,
        sender: payload.accountNumber || payload.sender || gateway || null,
        receiver: payload.receiver || null,
        gateway: gateway,
        reference_code: referenceCode,
        sepay_transaction_id: numSepayTxId,
        transfer_type: isOutbound ? "out" : "in",
        note: noteContent,
      })
      .returning("id");

    const receiptId = typeof receiptIdRes === "object" ? receiptIdRes.id : receiptIdRes;

    // Nếu là Tiền ra (OUT)
    if (isOutbound) {
      console.log(`📤 [Webhook] Đã lưu Biên lai Tiền ra #${receiptId} - Số tiền: ${transferAmount} ₫`);
      return {
        success: true,
        matched: false,
        receiptId,
        transferType: "out",
        amount: transferAmount,
      };
    }

    // 3. Nếu là Tiền vào (IN): Tìm đơn hàng khớp số tiền / mã đơn
    const UNPAID_STATUSES = [
      ORDER_STATUS.UNPAID,
      "Chưa Thanh Toán",
      ORDER_STATUS.RENEW_REQUIRED,
      "Cần Gia Hạn",
    ];

    // 3a. Tìm theo mã đơn hàng trong nội dung chuyển khoản trước (VD: ORD1234)
    let matchedOrder = null;
    if (noteContent && noteContent.trim()) {
      const matchOrderCode = noteContent.match(/ORD[-_]?\d+/i);
      if (matchOrderCode) {
        const targetCode = matchOrderCode[0].toUpperCase();
        matchedOrder = await getOrderTable(trx)
          .where("id_order", targetCode)
          .whereIn("status", UNPAID_STATUSES)
          .first();
      }
    }

    // 3b. Nếu chưa khớp theo mã, tìm đơn hàng có giá/gross_selling_price vừa đúng bằng transferAmount
    if (!matchedOrder) {
      matchedOrder = await getOrderTable(trx)
        .where((builder) => {
          builder.where("price", transferAmount).orWhere("gross_selling_price", transferAmount);
        })
        .whereIn("status", UNPAID_STATUSES)
        .orderBy("id", "desc")
        .first();
    }

    // NẾU KHÔNG KHỚP ĐƠN HÀNG NÀO: Giữ Biên lai ở trạng thái UNALLOCATED
    if (!matchedOrder) {
      console.log(`ℹ️ [Webhook] Đã tạo Biên lai Chưa phân bổ #${receiptId} - Số tiền: ${new Intl.NumberFormat("vi-VN").format(transferAmount)} ₫ (Không khớp đơn)`);
      return {
        success: true,
        matched: false,
        receiptId,
        amount: transferAmount,
        reason: `Đã lưu biên lai #${receiptId} chưa phân bổ (Không khớp đơn hàng)`,
      };
    }

    // NẾU KHỚP ĐƠN HÀNG THÀNH CÔNG
    const isRenewal = String(matchedOrder.status).toLowerCase().includes("gia hạn");
    const now = new Date();
    let newExpiredAt = matchedOrder.expired_at;
    const daysToAdd = Number(matchedOrder.days || 365);

    if (isRenewal) {
      let baseExpiry = now;
      if (matchedOrder.expired_at) {
        const parsed = new Date(matchedOrder.expired_at);
        if (!isNaN(parsed.getTime()) && parsed > now) {
          baseExpiry = parsed;
        }
      }
      const expiryDate = new Date(baseExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      newExpiredAt = expiryDate.toISOString().split("T")[0];
    }

    // Cập nhật trạng thái Biên lai sang FULLY_ALLOCATED
    await getReceiptTable(trx)
      .where({ id: receiptId })
      .update({
        status: "FULLY_ALLOCATED",
        unallocated_amount: 0,
      });

    // Tạo bản ghi phân bổ payment_receipt_allocations
    await getAllocationsTable(trx).insert({
      receipt_id: receiptId,
      allocation_type: "ORDER",
      target_code: matchedOrder.id_order,
      amount: transferAmount,
      remaining_balance: 0,
      note: `Tự động khớp Webhook (#${matchedOrder.id_order})`,
      created_by: "SYSTEM_WEBHOOK",
    });

    // Cập nhật Đơn hàng sang "Đã Thanh Toán"
    const updateFields = {
      status: "Đã Thanh Toán",
    };
    if (isRenewal && newExpiredAt) {
      updateFields.expired_at = newExpiredAt;
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: matchedOrder.id })
      .update(updateFields)
      .returning("*");

    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    console.log(`✅ [Webhook] Tự động tạo Biên lai #${receiptId} & Khớp thành công đơn #${updatedOrder.id_order} - Số tiền: ${formatMoney(transferAmount)}`);

    // Bắn các sự kiện domain sang EventBus
    eventBus.emit(EVENTS.ORDER_PAID, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      amount: transferAmount,
      status: updatedOrder.status,
      receiptId,
      isRenewal,
      action: "WEBHOOK_PAYMENT_MATCH",
    });

    if (isRenewal) {
      eventBus.emit(EVENTS.ORDER_RENEWED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        daysAdded: daysToAdd,
        newExpiredAt: updatedOrder.expired_at,
        receiptId,
        action: "RENEWAL_COMPLETED",
      });
    }

    return {
      success: true,
      matched: true,
      receiptId,
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      amount: transferAmount,
      previousStatus: matchedOrder.status,
      newStatus: updatedOrder.status,
      isRenewal,
    };
  });
}

module.exports = {
  processPaymentWebhook,
};

