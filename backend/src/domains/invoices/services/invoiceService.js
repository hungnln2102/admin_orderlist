/**
 * invoiceService.js (V2)
 * Quản lý Biên lai thanh toán (Admin UI):
 *   - getInvoices(): Lấy danh sách biên lai chia theo tab (orders, other, unlisted) + thống kê.
 *   - allocateReceipt(): Phân bổ số dư biên lai bằng tay (gán mã đơn, chi phí, credit...).
 *     → Dùng chung processOrderPayment (cập nhật trạng thái đơn, cộng ngày gia hạn, phát EventBus).
 */
const { db, TABLES, withTransaction } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { RECEIPT_STATUS, ALLOCATION_TYPE, ALLOCATION_CREATOR } = require("@/constants/receiptStatus");
const { processOrderPayment } = require("@/domains/orders/services/orderPaymentService");

const getReceiptTable = () => db(TABLES.PAYMENT_RECEIPT);

// ────────────── Tab Filter Helpers ──────────────

function applyOrdersTabFilter(builder) {
  builder.whereExists(function () {
    this.select(db.raw("1"))
      .from(TABLES.PAYMENT_RECEIPT_ALLOCATIONS)
      .whereRaw(`${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.receipt_id = ${TABLES.PAYMENT_RECEIPT}.id`)
      .where(`${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.allocation_type`, ALLOCATION_TYPE.ORDER);
  });
}

function applyOtherTabFilter(builder) {
  builder.where((b) => {
    b.where((b2) => {
      b2.where(`${TABLES.PAYMENT_RECEIPT}.transfer_type`, "out")
        .where(`${TABLES.PAYMENT_RECEIPT}.status`, "!=", RECEIPT_STATUS.UNALLOCATED);
    }).orWhereExists(function () {
      this.select(db.raw("1"))
        .from(TABLES.PAYMENT_RECEIPT_ALLOCATIONS)
        .whereRaw(`${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.receipt_id = ${TABLES.PAYMENT_RECEIPT}.id`)
        .where(`${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.allocation_type`, "!=", ALLOCATION_TYPE.ORDER);
    });
  });
}

function applyUnlistedTabFilter(builder) {
  builder.where(`${TABLES.PAYMENT_RECEIPT}.status`, RECEIPT_STATUS.UNALLOCATED);
}

// ────────────── getInvoices ──────────────

/**
 * Lấy danh sách biên lai thanh toán chia theo 3 tab (orders, other, unlisted) + Thống kê song song
 */
async function getInvoices({ page = 1, limit = 20, search = "", tab = "all", type = "all", matched = "all" } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  // 1. Thống kê số lượng 3 tab song song (Promise.all)
  const [[ordersRes], [otherRes], [unlistedRes], [totalRes]] = await Promise.all([
    getReceiptTable().where(applyOrdersTabFilter).count("id as count"),
    getReceiptTable().where(applyOtherTabFilter).count("id as count"),
    getReceiptTable().where(applyUnlistedTabFilter).count("id as count"),
    getReceiptTable().count("id as count"),
  ]);

  const tabCounts = {
    orders: Number(ordersRes?.count || 0),
    other: Number(otherRes?.count || 0),
    unlisted: Number(unlistedRes?.count || 0),
    all: Number(totalRes?.count || 0),
  };

  const stats = {
    totalReceipts: tabCounts.orders,
    unmatchedReceipts: tabCounts.unlisted,
    expenseReceipts: tabCounts.other,
  };

  // 2. Truy vấn danh sách biên lai
  let query = getReceiptTable()
    .leftJoin(TABLES.PAYMENT_RECEIPT_ALLOCATIONS, `${TABLES.PAYMENT_RECEIPT}.id`, `${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.receipt_id`)
    .leftJoin(TABLES.ORDER_LIST, `${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.target_code`, `${TABLES.ORDER_LIST}.id_order`)
    .select(
      `${TABLES.PAYMENT_RECEIPT}.id`,
      `${TABLES.PAYMENT_RECEIPT}.payment_date`,
      `${TABLES.PAYMENT_RECEIPT}.amount`,
      `${TABLES.PAYMENT_RECEIPT}.unallocated_amount`,
      `${TABLES.PAYMENT_RECEIPT}.status`,
      `${TABLES.PAYMENT_RECEIPT}.sender`,
      `${TABLES.PAYMENT_RECEIPT}.receiver`,
      `${TABLES.PAYMENT_RECEIPT}.gateway`,
      `${TABLES.PAYMENT_RECEIPT}.reference_code`,
      `${TABLES.PAYMENT_RECEIPT}.sepay_transaction_id`,
      `${TABLES.PAYMENT_RECEIPT}.transfer_type`,
      `${TABLES.PAYMENT_RECEIPT}.note`,
      db.raw(`MAX(${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.target_code) as id_order`),
      db.raw(`MAX(${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.allocation_type) as allocation_type`),
      db.raw(`MAX(${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.note) as alloc_note`),
      db.raw(`MAX(${TABLES.ORDER_LIST}.customer) as order_customer`),
      db.raw(`MAX(${TABLES.ORDER_LIST}.status) as order_status`)
    )
    .groupBy(`${TABLES.PAYMENT_RECEIPT}.id`);

  // Lọc theo Tab
  if (tab === "orders") {
    query = query.where(applyOrdersTabFilter);
  } else if (tab === "other") {
    query = query.where(applyOtherTabFilter);
  } else if (tab === "unlisted") {
    query = query.where(applyUnlistedTabFilter);
  }

  // Lọc thêm theo type nếu có
  if (type === "in") {
    query = query.where(`${TABLES.PAYMENT_RECEIPT}.transfer_type`, "in");
  } else if (type === "out") {
    query = query.where(`${TABLES.PAYMENT_RECEIPT}.transfer_type`, "out");
  }

  // Lọc thêm theo matched nếu có
  if (matched === "yes") {
    query = query.where(`${TABLES.PAYMENT_RECEIPT}.status`, "!=", RECEIPT_STATUS.UNALLOCATED);
  } else if (matched === "no") {
    query = query.where(`${TABLES.PAYMENT_RECEIPT}.status`, RECEIPT_STATUS.UNALLOCATED);
  }

  // Tìm kiếm từ khóa
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    query = query.where((b) => {
      b.whereILike(`${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.target_code`, s)
       .orWhereILike(`${TABLES.PAYMENT_RECEIPT}.sender`, s)
       .orWhereILike(`${TABLES.PAYMENT_RECEIPT}.reference_code`, s)
       .orWhereILike(`${TABLES.PAYMENT_RECEIPT}.sepay_transaction_id`, s)
       .orWhereILike(`${TABLES.PAYMENT_RECEIPT}.note`, s)
       .orWhereILike(`${TABLES.ORDER_LIST}.customer`, s);
    });
  }

  // Count filtered total
  const countQuery = getReceiptTable();
  if (tab === "orders") countQuery.where(applyOrdersTabFilter);
  else if (tab === "other") countQuery.where(applyOtherTabFilter);
  else if (tab === "unlisted") countQuery.where(applyUnlistedTabFilter);

  const [totalCountRes] = await countQuery.count("id as count");
  const filteredTotal = Number(totalCountRes?.count || 0);

  const data = await query
    .orderBy(`${TABLES.PAYMENT_RECEIPT}.id`, "desc")
    .limit(limitNum)
    .offset(offset);

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalOrders: filteredTotal,
      totalPages: Math.ceil(filteredTotal / limitNum) || 1,
    },
    tabCounts,
    stats,
  };
}

// ────────────── allocateReceipt ──────────────

/**
 * Phân bổ số dư biên lai thanh toán (Admin bấm gán thủ công).
 * Nếu gán cho Đơn hàng (ORDER): Cập nhật trạng thái đơn + cộng ngày gia hạn + phát EventBus.
 *
 * @param {number|string} receiptId
 * @param {object} payload - { allocation_type, target_code, amount, note, created_by }
 */
async function allocateReceipt(receiptId, payload) {
  const { allocation_type, target_code, amount, note, created_by } = payload || {};
  const id = Number(receiptId);

  if (!id || isNaN(id)) {
    throw new Error("Mã biên lai không hợp lệ.");
  }

  const allocAmount = Number(amount);
  if (isNaN(allocAmount) || allocAmount <= 0) {
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

      const orderPrice = Number(order.price || order.gross_selling_price || 0);
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
      if (fixedCostId && !isNaN(fixedCostId)) {
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
          target_type: "FIXED_COST",
          target_id: fixedCostId,
          period_month: periodMonth,
          financial_account_id: receipt.financial_account_id || null,
          amount: allocAmount,
          payment_date: paymentDate,
          note: note ? note.trim() : (receipt.note || `Thanh toán chi phí cố định từ Biên lai #${id}`),
        });
      }
    } else if (resolvedAllocType === ALLOCATION_TYPE.EXTERNAL_IMPORT || resolvedAllocType === "EXTERNAL_IMPORT") {
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
              profitDelta: -allocAmount,
              bankBalanceDelta: 0,
              context: `allocation.externalImport:#${id}${code ? ` (${code})` : ""}`,
            }).catch((e) => console.error("[InvoiceService] Lỗi gửi thông báo external_import:", e.message));
          }
        } catch (e) {
          console.error("[InvoiceService] Lỗi afterCommit external_import:", e.message);
        }
      });
    } else if (
      resolvedAllocType === ALLOCATION_TYPE.MONTHLY_EXPENSE ||
      resolvedAllocType === ALLOCATION_TYPE.EXPENSE ||
      resolvedAllocType === "MONTHLY_EXPENSE" ||
      resolvedAllocType === "EXPENSE" ||
      resolvedAllocType === "OPERATIONAL_EXPENSE"
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
async function getMatchableOrders({ q = "", limit = 50 } = {}) {
  const limitNum = Math.max(1, Math.min(200, Number(limit) || 50));
  let query = db(TABLES.ORDER_LIST)
    .select(
      "id",
      "id_order",
      "customer",
      "price",
      "status",
      "order_date",
      "information_order",
      "id_product"
    )
    .whereIn("status", [ORDER_STATUS.UNPAID, ORDER_STATUS.RENEW_REQUIRED, ORDER_STATUS.PROCESSING])
    .whereNotNull("id_order")
    .whereRaw("TRIM(id_order) != ''");

  if (q && q.trim()) {
    const s = `%${q.trim()}%`;
    query = query.where((b) => {
      b.whereILike("id_order", s)
       .orWhereILike("customer", s)
       .orWhereILike("information_order", s)
       .orWhereILike("transaction", s);
    });
  }

  const rows = await query
    .orderBy("id", "desc")
    .limit(limitNum);

  return rows.map((r) => ({
    id: Number(r.id),
    orderCode: r.id_order,
    customer: r.customer || "",
    price: Number(r.price || 0),
    status: r.status,
    orderDate: r.order_date,
    informationOrder: r.information_order || "",
    productId: r.id_product || "",
  }));
}

// ────────────── createInvoice ──────────────

/**
 * Tạo mới một biên lai thanh toán thủ công (Manual Payment Receipt).
 * Hỗ trợ:
 *   - Tạo biên lai Thu (in) hoặc Chi (out).
 *   - Tự động gán và thanh toán Đơn hàng nếu truyền order_code.
 *   - Ghi nhận biến động số dư và sổ cái STK shop nếu truyền financial_account_id.
 */
async function createInvoice(payload) {
  const {
    amount,
    transfer_type = "in",
    payment_date,
    gateway = "MANUAL",
    sender = "",
    receiver = "",
    reference_code,
    note = "",
    order_code,
    financial_account_id,
    created_by = "ADMIN",
  } = payload || {};

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Số tiền biên lai phải lớn hơn 0 ₫.");
  }

  return withTransaction(async (trx) => {
    const cleanOrderCode = order_code ? String(order_code).trim().toUpperCase() : null;
    let order = null;

    if (cleanOrderCode) {
      order = await trx(TABLES.ORDER_LIST)
        .where({ id_order: cleanOrderCode })
        .forUpdate()
        .first();

      if (!order) {
        throw new Error(`Không tìm thấy đơn hàng "${cleanOrderCode}".`);
      }

      if (![ORDER_STATUS.UNPAID, ORDER_STATUS.RENEW_REQUIRED, ORDER_STATUS.PROCESSING].includes(order.status)) {
        throw new Error(`Đơn hàng ${cleanOrderCode} đang ở trạng thái ${order.status}, không thể thanh toán.`);
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const resolvedDate = payment_date ? String(payment_date).slice(0, 10) : todayStr;
    const refCode = reference_code && reference_code.trim()
      ? reference_code.trim()
      : `MAN-${Date.now().toString(36).toUpperCase()}`;

    const isAllocatedToOrder = Boolean(order);
    const initialStatus = isAllocatedToOrder
      ? RECEIPT_STATUS.FULLY_ALLOCATED
      : RECEIPT_STATUS.UNALLOCATED;
    const unallocatedAmount = isAllocatedToOrder ? 0 : numAmount;

    // 1. Thêm bản ghi vào billing.payment_receipt
    const [receipt] = await trx(TABLES.PAYMENT_RECEIPT)
      .insert({
        payment_date: resolvedDate,
        amount: numAmount,
        unallocated_amount: unallocatedAmount,
        status: initialStatus,
        sender: sender.trim() || null,
        receiver: receiver.trim() || null,
        gateway: gateway.trim() || "MANUAL",
        reference_code: refCode,
        transfer_type: transfer_type === "out" ? "out" : "in",
        note: note.trim() || null,
      })
      .returning("*");

    const receiptId = typeof receipt.id === "object" ? receipt.id.id : receipt.id;

    // 2. Nếu có gán đơn hàng ngay -> Phân bổ và cập nhật đơn
    let orderResult = null;
    if (order) {
      await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).insert({
        receipt_id: receiptId,
        allocation_type: ALLOCATION_TYPE.ORDER,
        target_code: order.id_order,
        amount: numAmount,
        remaining_balance: 0,
        note: note.trim() || "Gán đơn khi tạo biên lai thủ công",
        created_by: created_by || ALLOCATION_CREATOR.ADMIN,
      });

      orderResult = await processOrderPayment(trx, order, numAmount, {
        receiptId,
        action: "MANUAL_RECEIPT_CREATE",
      });
    }

    // 3. Nếu chọn tài khoản tài chính (Shop Bank / USDT) -> Cập nhật số dư và ghi ledger
    const accId = Number(financial_account_id);
    if (accId && !isNaN(accId)) {
      const account = await trx(TABLES.FINANCIAL_ACCOUNTS)
        .where({ id: accId })
        .forUpdate()
        .first();

      if (account) {
        const currentBalance = Number(account.balance || 0);
        const isIncome = transfer_type !== "out";
        const newBalance = isIncome ? currentBalance + numAmount : currentBalance - numAmount;

        const updateData = {
          balance: newBalance,
          updated_at: db.fn.now(),
        };

        if (isIncome) {
          updateData.total_received = Number(account.total_received || 0) + numAmount;
        } else {
          updateData.total_withdrawn = Number(account.total_withdrawn || 0) + numAmount;
        }

        await trx(TABLES.FINANCIAL_ACCOUNTS)
          .where({ id: accId })
          .update(updateData);

        await trx(TABLES.FINANCIAL_ACCOUNT_LEDGER).insert({
          financial_account_id: accId,
          amount: isIncome ? numAmount : -numAmount,
          balance_after: newBalance,
          entry_type: isIncome ? "INCOME" : "EXPENSE",
          reference_type: "PAYMENT_RECEIPT",
          reference_id: String(receiptId),
          description: note.trim() || `Biên lai ${refCode}`,
          metadata: JSON.stringify({
            receiptId,
            referenceCode: refCode,
            transferType: transfer_type,
            orderCode: cleanOrderCode,
          }),
        });
      }
    }

    return {
      receipt,
      orderUpdated: orderResult ? {
        id_order: orderResult.updatedOrder.id_order,
        newStatus: orderResult.updatedOrder.status,
        isRenewal: orderResult.isRenewal,
        newExpiredAt: orderResult.newExpiredAt,
      } : null,
    };
  });
}

// ────────────── completeBatchPayment ──────────────

/**
 * Xác nhận thanh toán hàng loạt nhiều đơn hàng (VietQR / Gộp đơn).
 */
async function completeBatchPayment({ orderCodes = [], financialAccountId, gateway = "VietQR_Batch", note = "", created_by = "ADMIN" } = {}) {
  const codes = Array.isArray(orderCodes)
    ? orderCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
    : [];

  if (codes.length === 0) {
    throw new Error("Vui lòng chọn ít nhất 1 mã đơn hàng để thanh toán.");
  }

  return withTransaction(async (trx) => {
    const orders = await trx(TABLES.ORDER_LIST)
      .whereIn("id_order", codes)
      .forUpdate();

    if (orders.length !== codes.length) {
      const foundCodes = new Set(orders.map((o) => o.id_order));
      const missing = codes.filter((c) => !foundCodes.has(c));
      throw new Error(`Không tìm thấy các đơn hàng: ${missing.join(", ")}`);
    }

    const invalidOrders = orders.filter(
      (o) => ![ORDER_STATUS.UNPAID, ORDER_STATUS.RENEW_REQUIRED, ORDER_STATUS.PROCESSING].includes(o.status)
    );
    if (invalidOrders.length > 0) {
      const invalidCodes = invalidOrders.map((o) => `${o.id_order} (${o.status})`).join(", ");
      throw new Error(`Các đơn sau không thể thanh toán: ${invalidCodes}`);
    }

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.price || 0), 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const refCode = `BATCH-${Date.now().toString(36).toUpperCase()}`;

    // 1. Tạo biên lai tổng
    const [receipt] = await trx(TABLES.PAYMENT_RECEIPT)
      .insert({
        payment_date: todayStr,
        amount: totalAmount,
        unallocated_amount: 0,
        status: RECEIPT_STATUS.FULLY_ALLOCATED,
        sender: "Khách gộp đơn",
        gateway,
        reference_code: refCode,
        transfer_type: "in",
        note: note.trim() || `Thanh toán gộp ${codes.length} đơn: ${codes.join(", ")}`,
      })
      .returning("*");

    const receiptId = typeof receipt.id === "object" ? receipt.id.id : receipt.id;

    // 2. Phân bổ và cập nhật trạng thái từng đơn hàng
    const updatedOrders = [];
    for (const order of orders) {
      const itemPrice = Number(order.price || 0);

      await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).insert({
        receipt_id: receiptId,
        allocation_type: ALLOCATION_TYPE.ORDER,
        target_code: order.id_order,
        amount: itemPrice,
        remaining_balance: 0,
        note: `Thanh toán gộp mã batch ${refCode}`,
        created_by: created_by || ALLOCATION_CREATOR.ADMIN,
      });

      const orderResult = await processOrderPayment(trx, order, itemPrice, {
        receiptId,
        action: "BATCH_COMPLETE",
      });

      updatedOrders.push({
        id_order: order.id_order,
        newStatus: orderResult.updatedOrder.status,
      });
    }

    // 3. Nếu có tài khoản ngân hàng -> Cập nhật số dư và ledger
    const accId = Number(financialAccountId);
    if (accId && !isNaN(accId)) {
      const account = await trx(TABLES.FINANCIAL_ACCOUNTS)
        .where({ id: accId })
        .forUpdate()
        .first();

      if (account) {
        const currentBalance = Number(account.balance || 0);
        const newBalance = currentBalance + totalAmount;

        await trx(TABLES.FINANCIAL_ACCOUNTS)
          .where({ id: accId })
          .update({
            balance: newBalance,
            total_received: Number(account.total_received || 0) + totalAmount,
            updated_at: db.fn.now(),
          });

        await trx(TABLES.FINANCIAL_ACCOUNT_LEDGER).insert({
          financial_account_id: accId,
          amount: totalAmount,
          balance_after: newBalance,
          entry_type: "INCOME",
          reference_type: "PAYMENT_RECEIPT",
          reference_id: String(receiptId),
          description: `Thanh toán gộp ${codes.length} đơn (${refCode})`,
          metadata: JSON.stringify({ receiptId, refCode, orderCodes: codes }),
        });
      }
    }

    return {
      receipt,
      totalAmount,
      updatedOrders,
      count: codes.length,
    };
  });
}

module.exports = {
  getInvoices,
  allocateReceipt,
  getMatchableOrders,
  createInvoice,
  completeBatchPayment,
};
