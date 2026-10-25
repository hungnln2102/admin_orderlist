/**
 * webhookPaymentService.js (V2)
 * Xử lý Webhook thanh toán từ SePay / Ngân Hàng.
 *
 * Luồng xử lý:
 *  1. Kiểm tra Idempotency (Chống trùng lặp theo sepay_transaction_id).
 *  2. Lưu Biên lai mới vào bảng payment_receipt (status=UNALLOCATED).
 *  3. Nếu là Tiền ra (out): Lưu xong, trả về.
 *  4. Nếu là Tiền vào (in):
 *     a. Tìm đơn hàng khớp theo MÃ ĐƠN trong nội dung chuyển khoản.
 *     b. Nếu chưa khớp, tìm theo SỐ TIỀN khớp với price hoặc gross_selling_price.
 *     c. NẾU KHỚP: Ghi phân bổ, cập nhật đơn hàng sang PAID (+ cộng ngày nếu gia hạn), bắn EventBus.
 *     d. KHÔNG KHỚP: Giữ Biên lai ở UNALLOCATED.
 */
const { db, TABLES, withTransaction } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { RECEIPT_STATUS, TRANSFER_TYPE, ALLOCATION_TYPE, ALLOCATION_CREATOR } = require("@/constants/receiptStatus");
const { processCompleteOrder } = require("@/domains/orders/services/orderService");
const { creditFinancialAccount, debitFinancialAccount } = require("@/domains/wallets/services/walletService");

// Các trạng thái đơn hàng hợp lệ cần thanh toán
const PAYABLE_STATUSES = [
  ORDER_STATUS.UNPAID,
  ORDER_STATUS.RENEW_REQUIRED,
  ORDER_STATUS.PROCESSING,
  "Chưa Thanh Toán", // Tương thích ngược V1
  "Cần Gia Hạn",     // Tương thích ngược V1
  "Đang Xử Lý",      // Tương thích ngược V1
];

const getOrderTable = (trx = db) => trx(TABLES.ORDER_LIST);
const getReceiptTable = (trx = db) => trx(TABLES.PAYMENT_RECEIPT);
const getAllocationsTable = (trx = db) => trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS);

/**
 * Xử lý Webhook thanh toán từ SePay / Ngân Hàng.
 * @param {object} payload - Dữ liệu Webhook nhận được
 */
async function processPaymentWebhook(payload = {}) {
  const rawAmount = payload.transferAmount ?? payload.amount ?? payload.accumulatedAmount ?? payload.price ?? 0;
  const transferAmount = Math.round(Math.abs(Number(rawAmount)));

  if (!transferAmount || transferAmount <= 0) {
    return { success: false, matched: false, reason: "Số tiền chuyển khoản không hợp lệ (<= 0)" };
  }

  const rawTransferType = String(
    payload.transferType || payload.transfer_type || (Number(rawAmount) < 0 ? TRANSFER_TYPE.OUT : TRANSFER_TYPE.IN)
  ).toLowerCase();
  const isOutbound = rawTransferType === TRANSFER_TYPE.OUT || Number(rawAmount) < 0;

  const rawSepayTxId = payload.id || payload.sepay_transaction_id || payload.transactionId || null;
  const numSepayTxId = (rawSepayTxId && !isNaN(Number(rawSepayTxId))) ? String(rawSepayTxId).trim() : null;
  const referenceCode = payload.referenceCode || payload.code || (!numSepayTxId && rawSepayTxId ? String(rawSepayTxId) : null);
  const gateway = payload.gateway || payload.bankBrandName || "SEPAY";
  const noteContent = payload.content || payload.transactionContent || payload.note || "";
  const paymentDate = payload.transactionDate || payload.payment_date || new Date().toISOString().split("T")[0];
  const toDuplicateResult = (receipt) => ({
    success: true,
    duplicate: true,
    receiptId: receipt.id,
    matched: receipt.status === RECEIPT_STATUS.FULLY_ALLOCATED,
    amount: transferAmount,
    status: receipt.status,
  });

  // 1. Kiểm tra trùng lặp (Idempotency check)
  if (numSepayTxId) {
    const existing = await getReceiptTable()
      .where("sepay_transaction_id", numSepayTxId)
      .first();

    if (existing) {
      return toDuplicateResult(existing);
    }
  }

  try {
    return await withTransaction(async (trx) => {
    // 2. Tạo Biên lai mới — Luôn bắt đầu ở UNALLOCATED
    const [receiptIdRes] = await getReceiptTable(trx)
      .insert({
        payment_date: paymentDate,
        amount: transferAmount,
        unallocated_amount: isOutbound ? 0 : transferAmount,
        status: RECEIPT_STATUS.UNALLOCATED,
        sender: payload.accountNumber || payload.sender || gateway || null,
        receiver: payload.receiver || null,
        gateway,
        reference_code: referenceCode,
        sepay_transaction_id: numSepayTxId,
        transfer_type: isOutbound ? TRANSFER_TYPE.OUT : TRANSFER_TYPE.IN,
        note: noteContent,
      })
      .returning("id");

    const receiptId = typeof receiptIdRes === "object" ? receiptIdRes.id : receiptIdRes;

    // 3. Tiền ra (OUT) — Trừ tiền tài khoản/ví, lưu Biên lai rồi dừng
    if (isOutbound) {
      await debitFinancialAccount(trx, {
        accountNumber: payload.accountNumber || payload.receiver || null,
        amount: transferAmount,
        sourceKind: "payment_receipt",
        sourceId: receiptId,
        note: noteContent || `Webhook Tiền ra #${receiptId}`,
      });

      return {
        success: true,
        matched: false,
        receiptId,
        transferType: TRANSFER_TYPE.OUT,
        amount: transferAmount,
        reason: `Đã lưu Biên lai Tiền ra #${receiptId}`,
      };
    }

    // 4. Tiền vào (IN) — Cộng tiền tài khoản/ví ngay khi nhận Webhook
    await creditFinancialAccount(trx, {
      accountNumber: payload.accountNumber || payload.receiver || null,
      amount: transferAmount,
      sourceKind: "payment_receipt",
      sourceId: receiptId,
      note: noteContent || `Webhook Tiền vào #${receiptId}`,
    });

    // 5. Tìm đơn hàng phù hợp theo SỐ TIỀN THỰC CHUYỂN (Chính xác đến từng đồng nhờ slot suffix)
    const matchedOrder = await getOrderTable(trx)
      .where((builder) => {
        builder.where("price", transferAmount).orWhere("gross_selling_price", transferAmount);
      })
      .whereIn("status", PAYABLE_STATUSES)
      .orderBy("id", "desc")
      .forUpdate()
      .skipLocked()
      .first();

    // KHÔNG KHỚP ĐƠN NÀO — Giữ Biên lai ở UNALLOCATED
    if (!matchedOrder) {
      return {
        success: true,
        matched: false,
        receiptId,
        amount: transferAmount,
        reason: `Đã lưu Biên lai #${receiptId} chưa phân bổ (Không khớp đơn hàng nào)`,
      };
    }

    // KHỚP ĐƠN HÀNG THÀNH CÔNG — Cập nhật Biên lai, Phân bổ, Đơn hàng
    await getReceiptTable(trx)
      .where({ id: receiptId })
      .update({ status: RECEIPT_STATUS.FULLY_ALLOCATED, unallocated_amount: 0 });

    await getAllocationsTable(trx).insert({
      receipt_id: receiptId,
      allocation_type: ALLOCATION_TYPE.ORDER,
      target_code: matchedOrder.id_order,
      amount: transferAmount,
      remaining_balance: 0,
      note: `Tự động khớp Webhook (#${matchedOrder.id_order})`,
      created_by: ALLOCATION_CREATOR.SYSTEM_WEBHOOK,
    });

    const { updatedOrder, isRenewal } = await processCompleteOrder(trx, matchedOrder, transferAmount, {
      receiptId,
      action: "WEBHOOK_PAYMENT_MATCH",
    });

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
  } catch (error) {
    if (numSepayTxId && error?.code === "23505") {
      const existing = await getReceiptTable().where("sepay_transaction_id", numSepayTxId).first();
      if (existing) return toDuplicateResult(existing);
    }
    throw error;
  }
}

module.exports = { processPaymentWebhook };
