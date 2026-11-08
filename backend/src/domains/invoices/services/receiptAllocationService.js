const { db, TABLES, COLS, withTransaction } = require("@/db");
const { syncReceiptProfit, coverReceiptObligation } = require("@/domains/finance/services/receiptProfitService");
const { EVENTS, publishEventInTrx } = require("@/events");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { RECEIPT_STATUS, ALLOCATION_TYPE, ALLOCATION_CREATOR } = require("@/constants/receiptStatus");
const { processOrderPayment } = require("@/domains/orders/services/orderPaymentService");
const { resolveOrdersWithCatalogPrices } = require("./batchPaymentService");
const { resolveOrderCatalogPricing } = require("@/domains/products/services/catalogPricingService");
const { extractSlotSuffix, applySuffixToPrice } = require("@/domains/payments/services/slotSuffixService");

async function allocateReceiptInTrx(trx, receiptId, allocAmount, allocType, targetCode, note, obligation = null) {
  if (!Number.isFinite(allocAmount) || allocAmount <= 0) {
    throw new Error("Invalid receipt allocation amount");
  }

  const receipt = await trx(TABLES.PAYMENT_RECEIPT)
    .where({ id: Number(receiptId) })
    .forUpdate()
    .first();
  if (!receipt) throw new Error("Kh?ng t?m th?y bi?n lai thanh to?n");

  const currentUnallocated = Number(receipt.unallocated_amount ?? receipt.amount ?? 0);
  if (allocAmount > currentUnallocated) {
    throw new Error(`S? ti?n ph?n b? v??t qu? s? d? kh? d?ng c?a bi?n lai (${currentUnallocated.toLocaleString("vi-VN")} ?)`);
  }

  const newUnallocated = currentUnallocated - allocAmount;
  const newStatus = newUnallocated <= 0 ? RECEIPT_STATUS.FULLY_ALLOCATED : RECEIPT_STATUS.PARTIALLY_ALLOCATED;
  const [insertedAllocation] = await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS)
    .insert({
      receipt_id: receipt.id,
      allocation_type: allocType,
      target_code: targetCode ? String(targetCode) : null,
      amount: allocAmount,
      remaining_balance: newUnallocated,
      note: note || null,
      created_by: ALLOCATION_CREATOR.ADMIN,
    })
    .returning("id");
  const allocationId = typeof insertedAllocation === "object" ? insertedAllocation.id : insertedAllocation;

  if (obligation) {
    if (receipt.transfer_type !== "out") throw new Error("Debt payment requires an outgoing receipt");
    await coverReceiptObligation(trx, receipt, allocationId, obligation.type, obligation.target, obligation.periodMonth);
  }

  await trx(TABLES.PAYMENT_RECEIPT)
    .where({ id: receipt.id })
    .update({
      unallocated_amount: newUnallocated,
      status: newStatus,
    });
  await syncReceiptProfit(trx, receipt.id);

  return { allocationId, financialAccountId: receipt.financial_account_id };
}

async function allocateReceipt(receiptId, payload) {
  const { allocation_type, target_code, amount, note, created_by } = payload || {};
  const id = Number(receiptId);

  if (!id || isNaN(id)) {
    throw new Error("Mã biên lai không hợp lệ.");
  }

  const allocAmount = Number(amount);
  if (!Number.isFinite(allocAmount) || allocAmount <= 0) {
    throw new Error("Số tiền phân bổ phải lớn hơn 0 ₫.");
  }

  return withTransaction(async (trx) => {
    const receipt = await trx(TABLES.PAYMENT_RECEIPT)
      .where({ id })
      .forUpdate()
      .first();
    if (!receipt) {
      throw new Error("Không tìm thấy biên lai thanh toán.");
    }

    const currentUnallocated = Number(receipt.unallocated_amount ?? receipt.amount ?? 0);
    if (allocAmount > currentUnallocated) {
      throw new Error(`Số tiền phân bổ (${allocAmount.toLocaleString("vi-VN")} ₫) vượt quá số dư khả dụng (${currentUnallocated.toLocaleString("vi-VN")} ₫).`);
    }

    const newUnallocated = currentUnallocated - allocAmount;
    const newStatus = newUnallocated <= 0 ? RECEIPT_STATUS.FULLY_ALLOCATED : RECEIPT_STATUS.PARTIALLY_ALLOCATED;
    const resolvedAllocType = allocation_type || ALLOCATION_TYPE.ORDER;
    const code = target_code ? target_code.trim() : null;
    if (receipt.shop_out_expense_id && [ALLOCATION_TYPE.ORDER, "OTHER_INCOME"].includes(resolvedAllocType)) {
      throw new Error("Outgoing receipt cannot be allocated as income");
    }
    const receiptAccount = receipt.financial_account_id
      ? await trx(TABLES.FINANCIAL_ACCOUNTS).where(COLS.FINANCIAL_ACCOUNTS.ID, receipt.financial_account_id).first()
      : null;
    const postExpense = receiptAccount ? receiptAccount.account_scope === "SHOP" : !receipt.sepay_transaction_id;
    if (receipt.sepay_transaction_id && receipt.transfer_type === "out" && !receiptAccount) {
      throw new Error("Webhook receipt account must be resolved before allocation");
    }

    let order = null;
    if (resolvedAllocType === ALLOCATION_TYPE.ORDER) {
      if (!code) throw new Error("Mã đơn hàng là bắt buộc khi phân bổ loại ORDER.");

      order = await trx(TABLES.ORDER_LIST)
        .where({ id_order: code })
        .forUpdate()
        .first();
      if (!order) throw new Error(`Không tìm thấy đơn hàng ${code}.`);
      if (![ORDER_STATUS.UNPAID, ORDER_STATUS.RENEW_REQUIRED, ORDER_STATUS.PROCESSING].includes(order.status)) {
        throw new Error(`Đơn hàng ${code} đang ở trạng thái ${order.status}, không thể phân bổ thanh toán.`);
      }

      let orderPrice = Number(order.price || order.gross_selling_price || 0);
      const isRenewal = [ORDER_STATUS.RENEW_REQUIRED, "Cần Gia Hạn"].includes(order.status);
      if (isRenewal) {
        const { catalogBasePrice } = await resolveOrderCatalogPricing(trx, order);
        if (catalogBasePrice > 0) {
          const suffix = extractSlotSuffix(order) || 0;
          const dynamicPrice = applySuffixToPrice(catalogBasePrice, suffix);
          orderPrice = Math.max(orderPrice, dynamicPrice, catalogBasePrice);
        }
      }
      if (orderPrice > 0 && allocAmount > orderPrice) {
        throw new Error(`Số tiền phân bổ (${allocAmount.toLocaleString("vi-VN")} ₫) vượt quá giá trị đơn hàng (${orderPrice.toLocaleString("vi-VN")} ₫). Vui lòng nhập tối đa ${orderPrice.toLocaleString("vi-VN")} ₫.`);
      }
    }

    // 1. Thêm bản ghi phân bổ
    const [allocId] = await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).insert({
      receipt_id: id,
      allocation_type: resolvedAllocType,
      target_code: code,
      amount: allocAmount,
      remaining_balance: newUnallocated,
      note: note ? note.trim() : null,
      created_by: created_by || ALLOCATION_CREATOR.ADMIN,
    }).returning("id");

    const allocationId = typeof allocId === "object" ? allocId.id : allocId;

    // 2. Cập nhật số dư và trạng thái Biên lai gốc
    const receiptUpdates = {
      unallocated_amount: newUnallocated,
      status: newStatus,
    };
    if (resolvedAllocType === ALLOCATION_TYPE.ORDER && code && !receipt.id_order) {
      receiptUpdates.id_order = code;
    }
    await trx(TABLES.PAYMENT_RECEIPT)
      .where({ id })
      .update(receiptUpdates);

    // 3. Nếu gán cho Đơn hàng (ORDER): Cập nhật trạng thái đơn + gia hạn + phát EventBus
    let orderResult = null;
    if (order) {
      orderResult = await processOrderPayment(trx, order, allocAmount, {
        receiptId: id,
        action: "ADMIN_MANUAL_ALLOCATE",
      });
    }

    // 4. Nếu gán cho Chi Phí Cố Định: Ghi nhận thanh toán vào DEBT_PAYMENT_LOGS (KHÔNG ghi vào STORE_PROFIT_EXPENSES để chống double-counting)
    if (resolvedAllocType === "FIXED_COST" || (code && String(code).startsWith("FIXED_COST_"))) {
      const fixedCostId = Number(String(code).replace("FIXED_COST_", ""));
      if (!fixedCostId || !Number.isFinite(fixedCostId)) throw new Error("Invalid fixed cost target");
      {
        const fixedCost = await trx(TABLES.FIXED_COSTS).where("id", fixedCostId).forUpdate().first();
        if (!fixedCost) throw new Error("Fixed cost not found");
        await coverReceiptObligation(trx, receipt, allocationId, "FIXED_COST", fixedCost);
        const paymentDate = receipt.payment_date
          ? new Date(receipt.payment_date).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        const periodMonth = paymentDate.slice(0, 7);

        const existingLog = await trx(TABLES.DEBT_PAYMENT_LOGS)
          .where({ target_type: "FIXED_COST", target_id: fixedCostId, period_month: periodMonth })
          .first();

        if (existingLog) {
          throw new Error(`Khoản chi phí cố định này đã được thanh toán cho tháng ${periodMonth}!`);
        }

        await trx(TABLES.DEBT_PAYMENT_LOGS).insert({
          [COLS.DEBT_PAYMENT_LOGS.RECEIPT_ALLOCATION_ID]: allocationId,
          target_type: "FIXED_COST",
          target_id: fixedCostId,
          period_month: periodMonth,
          financial_account_id: receipt.financial_account_id || null,
          amount: allocAmount,
          payment_date: paymentDate,
          note: note ? note.trim() : (receipt.note || `Thanh toán chi phí cố định từ Biên lai #${id}`),
        });
      }
    } else if (resolvedAllocType === "PERSONAL_DEBT" || (code && String(code).startsWith("PERSONAL_DEBT_"))) {
      const debtId = Number(String(code).replace("PERSONAL_DEBT_", ""));
      if (!debtId || isNaN(debtId)) {
        throw new Error("Mã khoản nợ cá nhân không hợp lệ.");
      }

      const asset = await trx(TABLES.PERSONAL_ASSETS)
        .where({ id: debtId })
        .forUpdate()
        .first();
      if (!asset) {
        throw new Error(`Không tìm thấy khoản nợ cá nhân #${debtId}.`);
      }

      if (asset.type !== "DEBT_PAYABLE") throw new Error("Invalid debt target");
      await coverReceiptObligation(trx, receipt, allocationId, "PERSONAL_DEBT", asset);
      const currentDebt = Number(asset.amount || 0);
      if (allocAmount > currentDebt) throw new Error("Debt payment exceeds outstanding balance");
      const newDebt = Math.max(0, currentDebt - allocAmount);
      await trx(TABLES.PERSONAL_ASSETS)
        .where({ id: debtId })
        .update({
          amount: newDebt,
          updated_at: trx.fn.now(),
        });

      const paymentDate = receipt.payment_date
        ? new Date(receipt.payment_date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      await trx(TABLES.DEBT_PAYMENT_LOGS).insert({
        [COLS.DEBT_PAYMENT_LOGS.RECEIPT_ALLOCATION_ID]: allocationId,
        target_type: "PERSONAL_DEBT",
        target_id: debtId,
        financial_account_id: receipt.financial_account_id || null,
        amount: allocAmount,
        payment_date: paymentDate,
        note: note ? note.trim() : (receipt.note || `Trả bớt nợ "${asset.name}" từ Biên lai #${id}`),
      });
    } else if (resolvedAllocType === "INSTALLMENT" || (code && String(code).startsWith("INSTALLMENT_"))) {
      const instId = Number(String(code).replace("INSTALLMENT_", ""));
      if (!instId || isNaN(instId)) {
        throw new Error("Mã hợp đồng trả góp không hợp lệ.");
      }

      const installment = await trx(TABLES.INSTALLMENTS)
        .where({ id: instId })
        .forUpdate()
        .first();
      if (!installment) {
        throw new Error(`Không tìm thấy hợp đồng trả góp #${instId}.`);
      }
      await coverReceiptObligation(trx, receipt, allocationId, "INSTALLMENT", installment);

      const paymentDate = receipt.payment_date
        ? new Date(receipt.payment_date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const periodMonth = paymentDate.slice(0, 7);

      const existingLog = await trx(TABLES.DEBT_PAYMENT_LOGS)
        .where({ target_type: "INSTALLMENT", target_id: instId, period_month: periodMonth })
        .first();
      if (existingLog) {
        throw new Error(`Kỳ ${periodMonth} của khoản trả góp "${installment.name}" đã được thanh toán trước đó, không thể thanh toán trùng lặp!`);
      }

      await trx(TABLES.DEBT_PAYMENT_LOGS).insert({
        [COLS.DEBT_PAYMENT_LOGS.RECEIPT_ALLOCATION_ID]: allocationId,
        target_type: "INSTALLMENT",
        target_id: instId,
        period_month: periodMonth,
        financial_account_id: receipt.financial_account_id || null,
        amount: allocAmount,
        payment_date: paymentDate,
        note: note ? note.trim() : (receipt.note || `Thanh toán trả góp "${installment.name}" kỳ ${periodMonth} từ Biên lai #${id}`),
      });
    } else if (postExpense && (resolvedAllocType === ALLOCATION_TYPE.EXTERNAL_IMPORT || resolvedAllocType === "EXTERNAL_IMPORT")) {
      const expenseDate = receipt.payment_date
        ? new Date(receipt.payment_date).toISOString().slice(0, 10)
        : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

      await trx(TABLES.STORE_PROFIT_EXPENSES).insert({
        amount: allocAmount,
        expense_type: "external_import",
        expense_date: expenseDate,
        reason: note ? note.trim() : (receipt.note || `Nhập ngoài luồng từ Biên lai #${id}`),
        linked_order_code: code || null,
        payment_receipt_id: id,
        shop_bank_account_id: receipt.financial_account_id || null,
        status: "completed",
      });

      trx.afterCommit(() => {
        try {
          const { financeNotifier } = require("@/domains/notifications/telegram");
          const { getVietnamMonthString } = require("@/utils/time");
          if (typeof financeNotifier.notifyFinanceMonthlyDelta === "function") {
            financeNotifier.notifyFinanceMonthlyDelta({
              monthKey: getVietnamMonthString(expenseDate),
              revenueDelta: 0,
              importDelta: allocAmount,
              profitDelta: receipt.shop_out_expense_id ? 0 : -allocAmount,
              bankBalanceDelta: 0,
              context: `allocation.externalImport:#${id}${code ? ` (${code})` : ""}`,
            }).catch((e) => console.error("[InvoiceService] Lỗi gửi thông báo external_import:", e.message));
          }
        } catch (e) {
          console.error("[InvoiceService] Lỗi afterCommit external_import:", e.message);
        }
      });
    } else if (
      postExpense && (resolvedAllocType === ALLOCATION_TYPE.MONTHLY_EXPENSE ||
      resolvedAllocType === ALLOCATION_TYPE.EXPENSE ||
      resolvedAllocType === "MONTHLY_EXPENSE" ||
      resolvedAllocType === "EXPENSE" ||
      resolvedAllocType === "OPERATIONAL_EXPENSE")
    ) {
      const expenseDate = receipt.payment_date
        ? new Date(receipt.payment_date).toISOString().slice(0, 10)
        : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

      await trx(TABLES.STORE_PROFIT_EXPENSES).insert({
        amount: allocAmount,
        expense_type: "monthly_expense",
        expense_date: expenseDate,
        reason: note ? note.trim() : (receipt.note || `Chi phí từ Biên lai #${id}`),
        linked_order_code: code || null,
        payment_receipt_id: id,
        shop_bank_account_id: receipt.financial_account_id || null,
        status: "completed",
      });
    }

    await syncReceiptProfit(trx, id);

    const updatedReceipt = {
      ...receipt,
      ...receiptUpdates,
    };
    await publishEventInTrx(trx, {
      eventName: EVENTS.PAYMENT_RECEIPT_MUTATED,
      aggregateType: "PAYMENT_RECEIPT",
      aggregateId: id,
      action: "ALLOCATE",
      beforeState: receipt,
      afterState: updatedReceipt,
      changedFields: receiptUpdates,
      source: "API",
      reason: note ? note.trim() : null,
      payload: {
        receiptId: id,
        allocationId: typeof allocId === "object" ? allocId.id : allocId,
        allocationType: resolvedAllocType,
        targetCode: code,
        amount: allocAmount,
        remainingBalance: newUnallocated,
        orderId: order?.id || null,
      },
    });

    return {
      allocation_id: typeof allocId === "object" ? allocId.id : allocId,
      receipt_id: id,
      allocated_amount: allocAmount,
      unallocated_amount: newUnallocated,
      status: newStatus,
      orderUpdated: orderResult ? {
        id_order: orderResult.updatedOrder.id_order,
        newStatus: orderResult.updatedOrder.status,
        isRenewal: orderResult.isRenewal,
        newExpiredAt: orderResult.newExpiredAt,
      } : null,
    };
  });
}

// ────────────── getMatchableOrders ──────────────

/**
 * Lấy danh sách các đơn hàng ở trạng thái UNPAID hoặc RENEW_REQUIRED để phục vụ gợi ý gán biên lai
 */

module.exports = { allocateReceipt, allocateReceiptInTrx };
