/**
 * webhookPaymentService.js (V2)
 * Xử lý Webhook thanh toán từ SePay / Ngân Hàng.
 *
 * Luồng xử lý:
 *  1. Kiểm tra Idempotency (Chống trùng lặp theo sepay_transaction_id).
 *  2. Lưu Biên lai mới vào bảng payment_receipt (status=UNALLOCATED).
 *  3. Nếu là Tiền ra (out): Lưu xong, trả về.
 *  4. Nếu là Tiền vào (in):
 *     a. Đối soát 2 Lớp với Đợt Gộp (Batch Payment Requests):
 *        - Lớp 1: Khớp theo mã batch (MBP-YYYYMMDD-XXXX) + xác thực STK nhận.
 *        - Lớp 2: Khớp theo số tiền độc nhất (kèm Slot Suffix 1..100) + xác thực STK nhận.
 *        - Phân bổ theo đúng bảng giá order_allocations (MAVT 0đ, MAVL 150k...).
 *        - Idempotent: Bỏ qua các đơn con đã PAID (chống double-counting).
 *     b. Nếu không khớp đợt gộp: Khớp đơn hàng lẻ theo số tiền thực chuyển (kèm slot suffix đơn lẻ).
 *     c. KHÔNG KHỚP: Giữ Biên lai ở UNALLOCATED.
 */
const { db, TABLES, COLS, withTransaction } = require("@/db");
const { RECEIPT_STATUS, TRANSFER_TYPE } = require("@/constants/receiptStatus");
const { publishEventInTrx, EVENTS } = require("@/events");
const { processOutboundReceiptInTrx } = require("./webhookOutboundReceiptService");
const { processInboundReceiptInTrx } = require("./webhookInboundOrderService");

const getReceiptTable = (trx = db) => trx(TABLES.PAYMENT_RECEIPT);


/**
 * Xử lý Webhook thanh toán từ SePay / Ngân Hàng.
 * @param {object} payload - Dữ liệu Webhook nhận được
 */
async function processPaymentWebhook(payload = {}) {
  const rawAmount = payload.transferAmount ?? payload.amount ?? payload.accumulatedAmount ?? payload.price ?? 0;
  const transferAmount = Math.round(Math.abs(Number(rawAmount)));

  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
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
          unallocated_amount: transferAmount,
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
      const receipt = await getReceiptTable(trx).where({ id: receiptId }).first();
      await publishEventInTrx(trx, {
        eventName: EVENTS.PAYMENT_RECEIPT_MUTATED,
        aggregateType: "PAYMENT_RECEIPT",
        aggregateId: receiptId,
        action: "WEBHOOK_RECEIVED",
        afterState: receipt,
        source: "PAYMENT_WEBHOOK",
        idempotencyKey: numSepayTxId || referenceCode || `receipt:${receiptId}`,
        payload: {
          receiptId,
          amount: transferAmount,
          transferType: isOutbound ? TRANSFER_TYPE.OUT : TRANSFER_TYPE.IN,
          gateway,
          referenceCode,
          status: RECEIPT_STATUS.UNALLOCATED,
        },
      });

      // 3. Tiền ra (OUT) — ghi sổ cái và chỉ tất toán NCC khi khớp duy nhất.
      if (isOutbound) {
        return processOutboundReceiptInTrx({ trx, payload, receipt, receiptId, transferAmount, gateway, noteContent });
      }

      return processInboundReceiptInTrx({
        trx, payload, receipt, receiptId, transferAmount, gateway, noteContent, numSepayTxId, referenceCode,
      });
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
