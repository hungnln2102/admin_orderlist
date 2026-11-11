const { TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { RECEIPT_STATUS, ALLOCATION_TYPE, ALLOCATION_CREATOR } = require("@/constants/receiptStatus");
const { processCompleteOrder } = require("@/domains/orders/services/orderService");
const { creditFinancialAccount } = require("@/domains/wallets/services/walletService");
const { resolveOrderCatalogPricing } = require("@/domains/products/services/catalogPricingService");
const { extractSlotSuffix, getAvailableSuffix, applySuffixToPrice } = require("@/domains/payments/services/slotSuffixService");
const { publishEventInTrx, EVENTS } = require("@/events");
const { isMavrykSupplier } = require("@/domains/suppliers/utils/supplierCheck");

const PAYABLE_STATUSES = [
  ORDER_STATUS.UNPAID,
  ORDER_STATUS.RENEW_REQUIRED,
  ORDER_STATUS.PROCESSING,
  "Chưa Thanh Toán",
  "Cần Gia Hạn",
  "Đang Xử Lý",
];

const getOrderTable = (trx) => trx(TABLES.ORDER_LIST);
const getReceiptTable = (trx) => trx(TABLES.PAYMENT_RECEIPT);
const getAllocationsTable = (trx) => trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS);

async function processInboundReceiptInTrx({ trx, payload, receipt, receiptId, transferAmount, gateway, noteContent, numSepayTxId, referenceCode }) {
  const creditRes = await creditFinancialAccount(trx, {
    accountNumber: payload.accountNumber || payload.receiver || null,
    gateway,
    accountScope: "SHOP",
    amount: transferAmount,
    sourceKind: "payment_receipt",
    sourceId: receiptId,
    note: noteContent || `Webhook Tiền vào #${receiptId}`,
  });
  const receivingAccountId = creditRes?.accountId || null;

  // 5. Đối soát 2 Lớp: Kiểm tra xem có khớp Đơn Gộp (Batch Payment Request) không
  const batchCodeMatch = String(noteContent).match(/MBP-[A-Z0-9-]+/i);
  let matchedBatch = null;

  // Lớp 1: Khớp theo Mã Batch trong nội dung chuyển khoản + xác nhận STK nhận tiền
  if (batchCodeMatch) {
    const extractedCode = batchCodeMatch[0].toUpperCase();
    let queryL1 = trx(TABLES.BATCH_PAYMENT_REQUESTS)
      .where({ batch_code: extractedCode, status: "PENDING" })
      .where("expires_at", ">=", trx.fn.now());

    if (receivingAccountId) {
      queryL1 = queryL1.andWhere(function () {
        this.whereNull("financial_account_id").orWhere("financial_account_id", receivingAccountId);
      });
    }
    matchedBatch = await queryL1.forUpdate().first();
}

// Lớp 2: Khớp theo Số Tiền Độc Nhất (kèm Slot Suffix 1..100) + xác nhận STK nhận tiền
if (!matchedBatch) {
  let queryL2 = trx(TABLES.BATCH_PAYMENT_REQUESTS)
    .where({ total_amount: transferAmount, status: "PENDING" })
    .where("expires_at", ">=", trx.fn.now());

  if (receivingAccountId) {
    queryL2 = queryL2.andWhere(function () {
      this.whereNull("financial_account_id").orWhere("financial_account_id", receivingAccountId);
    });
  }
  matchedBatch = await queryL2.orderBy("id", "desc").forUpdate().skipLocked().first();
}

// XỬ LÝ KHỚP ĐỢN GỘP THÀNH CÔNG
if (matchedBatch) {
  await trx(TABLES.BATCH_PAYMENT_REQUESTS)
    .where({ id: matchedBatch.id })
    .update({
      status: "COMPLETED",
      payment_receipt_id: receiptId,
      updated_at: trx.fn.now(),
    });

  const orderCodes = Array.isArray(matchedBatch.order_codes)
    ? matchedBatch.order_codes
    : JSON.parse(matchedBatch.order_codes || "[]");

  const subOrders = await getOrderTable(trx)
    .whereIn("id_order", orderCodes)
    .forUpdate();

  // Đọc danh sách phân bổ giá gốc chuẩn đã lưu lúc tạo batch
  const savedAllocations = Array.isArray(matchedBatch.order_allocations)
    ? matchedBatch.order_allocations
    : JSON.parse(matchedBatch.order_allocations || "[]");
  const allocMap = new Map(savedAllocations.map((a) => [a.orderCode, a]));

  // Lọc danh sách các đơn con còn chờ thanh toán (PAYABLE)
  const activePayableOrders = subOrders.filter((o) => PAYABLE_STATUSES.includes(o.status));

  // 1. Tính toán chi phí nhập hàng tổng hợp cho đợt gộp (loại trừ Mavryk)
  let totalBatchCost = 0;
  for (const subOrder of subOrders) {
    const isMavryk = await isMavrykSupplier(trx, subOrder);
    if (!isMavryk) {
      totalBatchCost += Number(subOrder.cost || 0);
    }
  }

  let totalAllocated = 0;
  const updatedOrders = [];
  const failedOrders = [];

  for (let i = 0; i < subOrders.length; i++) {
    const subOrder = subOrders[i];

    // Nếu đơn con đã chuyển sang PAID trước đó -> Bỏ qua, chống nhân đôi thanh toán & ledger
    if (!PAYABLE_STATUSES.includes(subOrder.status)) {
      console.warn(`[WebhookBatch] Đơn ${subOrder.id_order} đã ở trạng thái ${subOrder.status}, bỏ qua thanh toán trùng.`);
      continue;
    }

    const allocInfo = allocMap.get(subOrder.id_order);
    const baseOrderPrice = allocInfo
      ? Number(allocInfo.basePrice || 0)
      : Math.round(Number(subOrder.price || subOrder.gross_selling_price || 0));

    // Đơn cuối cùng trong số các đơn còn chờ thanh toán nhận phần bù slot_suffix
    const isLastActive = (subOrder.id_order === activePayableOrders[activePayableOrders.length - 1]?.id_order);
    const allocAmount = isLastActive
      ? (transferAmount - totalAllocated)
      : baseOrderPrice;

    totalAllocated += allocAmount;

    await getAllocationsTable(trx).insert({
      receipt_id: receiptId,
      allocation_type: ALLOCATION_TYPE.ORDER,
      target_code: subOrder.id_order,
      amount: allocAmount,
      remaining_balance: 0,
      note: `Tự động khớp Đơn gộp #${matchedBatch.batch_code} (${subOrder.id_order})`,
      created_by: ALLOCATION_CREATOR.SYSTEM_WEBHOOK,
    });

    // Bọc độc lập việc gia hạn kỹ thuật cho từng đơn con
    try {
      const { updatedOrder, isRenewal } = await processCompleteOrder(trx, subOrder, allocAmount, {
        receiptId,
        action: "BATCH_WEBHOOK_PAYMENT_MATCH",
        skipFinanceNotification: true,
        isBatch: true,
      });

      updatedOrders.push({
        id: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        amount: allocAmount,
        previousStatus: subOrder.status,
        newStatus: updatedOrder.status,
        isRenewal,
      });
    } catch (err) {
      console.error(`[WebhookBatch] Lỗi gia hạn đơn con #${subOrder.id_order} trong đợt gộp:`, err.message);
      failedOrders.push({
        id: subOrder.id,
        id_order: subOrder.id_order,
        customer: subOrder.customer,
        error: err.message,
      });
    }
  }

  // Cập nhật trạng thái và số dư Biên lai (nếu có đơn đã thanh toán trước thì giữ tiền thừa ở unallocated)
  const unallocatedAmount = Math.max(0, transferAmount - totalAllocated);
  const finalReceiptStatus = unallocatedAmount <= 0
    ? RECEIPT_STATUS.FULLY_ALLOCATED
    : RECEIPT_STATUS.PARTIALLY_ALLOCATED;

  await getReceiptTable(trx)
    .where({ id: receiptId })
    .update({
      status: finalReceiptStatus,
      unallocated_amount: unallocatedAmount,
    });

  // Bắn DUY NHẤT 1 sự kiện cấp Đợt Gộp qua EventBus sau khi commit transaction!
  const batchEventPayload = {
    batchId: matchedBatch.id,
    batchCode: matchedBatch.batch_code,
    receiptId,
    transferAmount,
    totalRevenue: transferAmount,
    totalCost: totalBatchCost,
    transactionDate: payload.transactionDate,
    customerName: matchedBatch.customer_name,
    ordersCount: subOrders.length,
    orders: updatedOrders,
    failedOrders,
  };

  await publishEventInTrx(trx, {
    eventName: EVENTS.BATCH_PAYMENT_COMPLETED,
    aggregateType: "BATCH_PAYMENT_REQUEST",
    aggregateId: matchedBatch.id,
    action: "WEBHOOK_COMPLETE",
    beforeState: matchedBatch,
    afterState: { ...matchedBatch, status: "COMPLETED", payment_receipt_id: receiptId },
    changedFields: { status: { old: matchedBatch.status, new: "COMPLETED" }, payment_receipt_id: { old: matchedBatch.payment_receipt_id, new: receiptId } },
    source: "PAYMENT_WEBHOOK",
    idempotencyKey: numSepayTxId || referenceCode || `batch:${matchedBatch.id}:receipt:${receiptId}`,
    payload: batchEventPayload,
  });

  const updatedReceipt = await getReceiptTable(trx).where({ id: receiptId }).first();
  await publishEventInTrx(trx, {
    eventName: EVENTS.PAYMENT_RECEIPT_MUTATED,
    aggregateType: "PAYMENT_RECEIPT",
    aggregateId: receiptId,
    action: "BATCH_ALLOCATED",
    beforeState: receipt,
    afterState: updatedReceipt,
    changedFields: { status: { old: receipt.status, new: updatedReceipt.status }, unallocated_amount: { old: receipt.unallocated_amount, new: updatedReceipt.unallocated_amount } },
    source: "PAYMENT_WEBHOOK",
    payload: { receiptId, batchId: matchedBatch.id, batchCode: matchedBatch.batch_code, transferAmount, totalAllocated, unallocatedAmount },
  });

  return {
    success: true,
    matched: true,
    isBatch: true,
    batchId: matchedBatch.id,
    batchCode: matchedBatch.batch_code,
    receiptId,
    amount: transferAmount,
    ordersCount: updatedOrders.length,
    orders: updatedOrders,
    failedOrders,
  };
}

// 6. Nếu không khớp đợt gộp nào: Tìm đơn hàng lẻ
// 6a. Tìm theo SỐ TIỀN THỰC CHUYỂN lưu trong DB
let matchedOrder = await getOrderTable(trx)
  .where((builder) => {
    builder.where("price", transferAmount).orWhere("gross_selling_price", transferAmount);
  })
  .whereIn("status", PAYABLE_STATUSES)
  .orderBy("id", "desc")
  .forUpdate()
  .skipLocked()
  .first();

// 6b. Đối soát nâng cao: Nếu nội dung chuyển khoản có chứa mã đơn hàng (VD: MAVLUQXW, MAVK12345...)
if (!matchedOrder && noteContent) {
  const orderCodeMatch = String(noteContent).match(/\b(MAV[A-Z0-9]{5,10})\b/i);
  if (orderCodeMatch) {
    const extractedCode = orderCodeMatch[1].toUpperCase();
    const candidateByCode = await getOrderTable(trx)
      .where("id_order", extractedCode)
      .whereIn("status", PAYABLE_STATUSES)
      .forUpdate()
      .skipLocked()
      .first();

    if (candidateByCode) {
      const isRenew = [ORDER_STATUS.RENEW_REQUIRED, "Cần Gia Hạn"].includes(candidateByCode.status);
      if (isRenew) {
        const { catalogBasePrice } = await resolveOrderCatalogPricing(trx, candidateByCode);
        const suffix = extractSlotSuffix(candidateByCode) || await getAvailableSuffix(trx, candidateByCode.id);
        const expectedPrice = catalogBasePrice > 0 ? applySuffixToPrice(catalogBasePrice, suffix) : Number(candidateByCode.price || 0);

        if (
          transferAmount === expectedPrice ||
          transferAmount === catalogBasePrice ||
          transferAmount === Number(candidateByCode.price) ||
          transferAmount === Number(candidateByCode.gross_selling_price)
        ) {
          matchedOrder = candidateByCode;
          if (catalogBasePrice > 0) {
            await getOrderTable(trx)
              .where({ id: candidateByCode.id })
              .update({
                gross_selling_price: catalogBasePrice,
                price: expectedPrice,
              });
            matchedOrder.gross_selling_price = catalogBasePrice;
            matchedOrder.price = expectedPrice;
          }
        }
      } else if (
        transferAmount === Number(candidateByCode.price) ||
        transferAmount === Number(candidateByCode.gross_selling_price)
      ) {
        matchedOrder = candidateByCode;
      }
    }
  }
}

// 6c. Nâng cấp cốt lõi (Chỉ đạo của Master): Đơn CẦN GIA HẠN (RENEW_REQUIRED) bắt buộc lấy GIÁ CATALOG MỚI NHẤT
// Nếu khách chuyển tiền theo giá Catalog mới mà trong DB đơn chưa kịp cập nhật giá -> Tự động tính giá Catalog và khớp ngay
if (!matchedOrder) {
  const renewCandidates = await getOrderTable(trx)
    .whereIn("status", [ORDER_STATUS.RENEW_REQUIRED, "Cần Gia Hạn"])
    .orderBy("id", "desc")
    .forUpdate()
    .skipLocked();

  for (const candidate of renewCandidates) {
    const { catalogBasePrice, catalogCostPrice } = await resolveOrderCatalogPricing(trx, candidate);
    if (catalogBasePrice > 0) {
      const suffix = extractSlotSuffix(candidate) || await getAvailableSuffix(trx, candidate.id);
      const expectedRenewalPrice = applySuffixToPrice(catalogBasePrice, suffix);

      if (transferAmount === expectedRenewalPrice || transferAmount === catalogBasePrice) {
        matchedOrder = candidate;
        // Đồng bộ luôn giá Catalog mới (cả giá bán và giá nhập NCC) vào đơn hàng trong DB
        const syncRenewalData = {
          gross_selling_price: catalogBasePrice,
          price: expectedRenewalPrice,
        };
        if (catalogCostPrice != null && Number.isFinite(catalogCostPrice) && catalogCostPrice > 0) {
          syncRenewalData.cost = catalogCostPrice;
          matchedOrder.cost = catalogCostPrice;
        }
        await getOrderTable(trx)
          .where({ id: candidate.id })
          .update(syncRenewalData);
        matchedOrder.gross_selling_price = catalogBasePrice;
        matchedOrder.price = expectedRenewalPrice;
        break;
      }
    }
  }
}

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

// KHỚP ĐƠN HÀNG LẺ THÀNH CÔNG — Cập nhật Biên lai, Phân bổ, Đơn hàng
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

const updatedReceipt = await getReceiptTable(trx).where({ id: receiptId }).first();
await publishEventInTrx(trx, {
  eventName: EVENTS.PAYMENT_RECEIPT_MUTATED,
  aggregateType: "PAYMENT_RECEIPT",
  aggregateId: receiptId,
  action: "ORDER_ALLOCATED",
  beforeState: receipt,
  afterState: updatedReceipt,
  changedFields: { status: { old: receipt.status, new: updatedReceipt.status }, unallocated_amount: { old: receipt.unallocated_amount, new: updatedReceipt.unallocated_amount } },
  source: "PAYMENT_WEBHOOK",
  payload: { receiptId, orderId: matchedOrder.id, id_order: matchedOrder.id_order, amount: transferAmount },
});
const { updatedOrder, isRenewal } = await processCompleteOrder(trx, matchedOrder, transferAmount, {
  receiptId,
  action: "WEBHOOK_PAYMENT_MATCH",
  transactionDate: payload.transactionDate,
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

}

module.exports = { processInboundReceiptInTrx };
