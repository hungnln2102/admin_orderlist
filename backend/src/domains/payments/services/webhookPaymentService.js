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
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { RECEIPT_STATUS, TRANSFER_TYPE, ALLOCATION_TYPE, ALLOCATION_CREATOR } = require("@/constants/receiptStatus");
const { processCompleteOrder } = require("@/domains/orders/services/orderService");
const { creditFinancialAccount, debitFinancialAccount } = require("@/domains/wallets/services/walletService");
const { settleSupplierDebtTransaction } = require("@/domains/suppliers/services/supplierSettlementService");
const { SUPPLIER_PAYMENT_STATUS } = require("@/constants/supplierStatus");
const { resolveOrderCatalogPricing } = require("@/domains/products/services/catalogPricingService");
const { extractSlotSuffix, getAvailableSuffix, applySuffixToPrice } = require("@/domains/payments/services/slotSuffixService");
const { publishEventInTrx, EVENTS } = require("@/events");
const { isMavrykSupplier } = require("@/domains/suppliers/utils/supplierCheck");


// Các trạng thái đơn hàng hợp lệ cần thanh toán
const PAYABLE_STATUSES = [
  ORDER_STATUS.UNPAID,
  ORDER_STATUS.RENEW_REQUIRED,
  ORDER_STATUS.PROCESSING,
  "Chưa Thanh Toán",
  "Cần Gia Hạn",
  "Đang Xử Lý",
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
        await debitFinancialAccount(trx, {
          accountNumber: payload.accountNumber || payload.receiver || null,
          gateway,
          accountScope: "SHOP",
          amount: transferAmount,
          sourceKind: "payment_receipt",
          sourceId: receiptId,
          note: noteContent || `Webhook Tiền ra #${receiptId}`,
        });

        const candidateSuppliers = await trx(`${TABLES.SUPPLIER} as s`)
          .leftJoin(`${TABLES.SUPPLIER_ORDER_COST_LOG} as l`, `l.${COLS.SUPPLIER_ORDER_COST_LOG.SUPPLY_ID}`, `s.${COLS.SUPPLIER.ID}`)
          .where(`l.${COLS.SUPPLIER_ORDER_COST_LOG.NCC_PAYMENT_STATUS}`, SUPPLIER_PAYMENT_STATUS.UNPAID)
          .groupBy(`s.${COLS.SUPPLIER.ID}`, `s.${COLS.SUPPLIER.NUMBER_BANK}`)
          .havingRaw(
            `COALESCE(SUM(l.${COLS.SUPPLIER_ORDER_COST_LOG.IMPORT_COST}), 0) = ? + s.${COLS.SUPPLIER.ID}`,
            [transferAmount]
          )
          .select(`s.${COLS.SUPPLIER.ID}`, `s.${COLS.SUPPLIER.NUMBER_BANK}`);

        // Chỉ đạo tối cao của Master: Bỏ đối soát theo nội dung chuyển khoản, chỉ khớp theo số tiền công thức
        if (candidateSuppliers.length === 1) {
          const supplierId = Number(candidateSuppliers[0].id);
          const settlement = await settleSupplierDebtTransaction({
            trx,
            supplierId,
            receiptId,
            bankPaidAmount: transferAmount,
            source: "WEBHOOK",
          });
          return {
            success: true,
            matched: settlement.settled,
            receiptId,
            supplierId,
            transferType: TRANSFER_TYPE.OUT,
            amount: transferAmount,
            settlement,
          };
        }

        return {
          success: true,
          matched: false,
          receiptId,
          transferType: TRANSFER_TYPE.OUT,
          amount: transferAmount,
          reason: `Đã lưu Biên lai Tiền ra #${receiptId} chưa phân bổ NCC`,
        };
      }

      // 4. Tiền vào (IN) — Cộng tiền tài khoản/ví ngay khi nhận Webhook
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
