const { db, TABLES } = require("@/db");

const getReceiptTable = () => db(TABLES.PAYMENT_RECEIPT);
const getAllocationsTable = () => db(TABLES.PAYMENT_RECEIPT_ALLOCATIONS);

function applyOrdersTabFilter(builder) {
  builder.whereExists(function () {
    this.select(db.raw("1"))
      .from(TABLES.PAYMENT_RECEIPT_ALLOCATIONS)
      .whereRaw(`${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.receipt_id = ${TABLES.PAYMENT_RECEIPT}.id`)
      .where(`${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.allocation_type`, "ORDER");
  });
}

function applyOtherTabFilter(builder) {
  builder.where((b) => {
    b.where(`${TABLES.PAYMENT_RECEIPT}.transfer_type`, "out")
      .orWhereExists(function () {
        this.select(db.raw("1"))
          .from(TABLES.PAYMENT_RECEIPT_ALLOCATIONS)
          .whereRaw(`${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.receipt_id = ${TABLES.PAYMENT_RECEIPT}.id`)
          .where(`${TABLES.PAYMENT_RECEIPT_ALLOCATIONS}.allocation_type`, "!=", "ORDER");
      });
  });
}

function applyUnlistedTabFilter(builder) {
  builder.where(`${TABLES.PAYMENT_RECEIPT}.status`, "UNALLOCATED")
    .where((b) => {
      b.whereNull(`${TABLES.PAYMENT_RECEIPT}.transfer_type`).orWhere(`${TABLES.PAYMENT_RECEIPT}.transfer_type`, "!=", "out");
    });
}

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
    query = query.where(`${TABLES.PAYMENT_RECEIPT}.status`, "!=", "UNALLOCATED");
  } else if (matched === "no") {
    query = query.where(`${TABLES.PAYMENT_RECEIPT}.status`, "UNALLOCATED");
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

/**
 * Phân bổ số dư biên lai thanh toán (Gán mã đơn, đợt nhập, chi phí hoặc credit)
 * @param {number|string} receiptId
 * @param {object} payload
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

  const receipt = await getReceiptTable().where({ id }).first();
  if (!receipt) {
    throw new Error("Không tìm thấy biên lai thanh toán.");
  }

  const currentUnallocated = Number(receipt.unallocated_amount || receipt.amount || 0);
  if (allocAmount > currentUnallocated) {
    throw new Error(`Số tiền phân bổ (${allocAmount.toLocaleString("vi-VN")} ₫) vượt quá số dư khả dụng (${currentUnallocated.toLocaleString("vi-VN")} ₫).`);
  }

  const newUnallocated = currentUnallocated - allocAmount;
  const newStatus = newUnallocated <= 0 ? "FULLY_ALLOCATED" : "PARTIALLY_ALLOCATED";

  return await db.transaction(async (trx) => {
    // 1. Thêm bản ghi phân bổ mới vào payment_receipt_allocations
    const [allocId] = await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).insert({
      receipt_id: id,
      allocation_type: allocation_type || "ORDER",
      target_code: target_code ? target_code.trim() : null,
      amount: allocAmount,
      remaining_balance: newUnallocated,
      note: note ? note.trim() : null,
      created_by: created_by || "ADMIN",
    }).returning("id");

    // 2. Cập nhật lại số dư và trạng thái của payment_receipt gốc
    await trx(TABLES.PAYMENT_RECEIPT)
      .where({ id })
      .update({
        unallocated_amount: newUnallocated,
        status: newStatus,
      });

    // 3. Nếu gán cho Đơn hàng (ORDER), kiểm tra và cập nhật trạng thái Đơn hàng sang PAID
    if ((allocation_type === "ORDER" || !allocation_type) && target_code) {
      const code = target_code.trim();
      const order = await trx(TABLES.ORDER_LIST).where({ id_order: code }).first();
      if (order) {
        // Cập nhật trạng thái đơn hàng thành PAID (Đã Thanh Toán)
        await trx(TABLES.ORDER_LIST)
          .where({ id_order: code })
          .update({ status: "PAID" });
      }
    }

    return {
      allocation_id: typeof allocId === "object" ? allocId.id : allocId,
      receipt_id: id,
      allocated_amount: allocAmount,
      unallocated_amount: newUnallocated,
      status: newStatus,
    };
  });
}

module.exports = {
  getInvoices,
  allocateReceipt,
};
