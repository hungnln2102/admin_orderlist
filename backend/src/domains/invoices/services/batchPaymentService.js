/**
 * batchPaymentService.js
 * Quản lý các phiên gộp đơn thanh toán (Batch Payment Requests) kèm Slot Suffix.
 *
 * Quy tắc cốt lõi của Master:
 *  1. Tuyệt đối không làm tròn số học.
 *  2. Dựa vào tiền tố mã đơn (MAVL, MAVC, MAVK, MAVS) và display_name để tra cứu đúng giá gốc từ bảng giá business.variant_price:
 *     - MAVL (Bán Lẻ)     -> tier_id = 2
 *     - MAVC (CTV)        -> tier_id = 1
 *     - MAVK (Khuyến Mãi) -> tier_id = 3
 *     - MAVS (Sinh Viên)  -> tier_id = 4
 *     - MAVT (Quà Tặng)   -> 0
 *  3. Tổng tiền gốc của đợt gộp = tổng các giá gốc trên.
 *  4. Sau đó mới cấp Slot Suffix độc nhất (1..100) -> total_amount = base_amount + slot_suffix.
 *  5. Khi 1 đơn trong batch được thanh toán riêng hoặc hết hạn -> Tự động loại trừ ra khỏi batch PENDING.
 *  6. Khi tạo batch mới bị trùng đơn với batch cũ -> Hủy batch cũ nếu Master/Admin xác nhận.
 */
const { db, TABLES, withTransaction } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { getAvailableSuffix } = require("@/domains/payments/services/slotSuffixService");

const PAYABLE_STATUSES = [
  ORDER_STATUS.UNPAID,
  ORDER_STATUS.RENEW_REQUIRED,
  ORDER_STATUS.PROCESSING,
  "Chưa Thanh Toán",
  "Cần Gia Hạn",
  "Đang Xử Lý",
];

const BATCH_ADVISORY_LOCK_ID = 1029001;

/**
 * Phân tích tiền tố mã đơn hàng (MAVL, MAVC, MAVK, MAVS...)
 */
function getOrderPrefix(idOrder) {
  if (!idOrder) return "MAVL";
  const upper = String(idOrder).trim().toUpperCase();
  if (upper.startsWith("MAVC")) return "MAVC";
  if (upper.startsWith("MAVL")) return "MAVL";
  if (upper.startsWith("MAVK")) return "MAVK";
  if (upper.startsWith("MAVS")) return "MAVS";
  if (upper.startsWith("MAVT")) return "MAVT";
  if (upper.startsWith("MAVN")) return "MAVN";
  return "MAVL";
}

/**
 * Tra cứu giá gốc chính xác từ Bảng Giá (business.variant_price) theo tiền tố mã đơn:
 *  - MAVL (Bán lẻ)    -> tier_id = 2
 *  - MAVC (CTV)       -> tier_id = 1
 *  - MAVK (Khuyến mãi)-> tier_id = 3
 *  - MAVS (Sinh viên) -> tier_id = 4
 *  - MAVT (Quà tặng)  -> 0
 */
async function resolveOrdersWithCatalogPrices(queryDb, orders = []) {
  if (!orders || orders.length === 0) return [];

  // Lấy danh sách id_product
  const vIds = Array.from(
    new Set(
      orders
        .map((o) => o.id_product)
        .filter((id) => id != null && String(id).trim() !== "")
    )
  );

  const numericVIds = vIds.map(Number).filter((n) => !isNaN(n) && n > 0);
  const textVIds = vIds.map(String).filter((s) => isNaN(Number(s)));

  let variantsQuery = queryDb(TABLES.VARIANT);
  if (numericVIds.length > 0 && textVIds.length > 0) {
    variantsQuery = variantsQuery.where(function () {
      this.whereIn("id", numericVIds)
        .orWhereIn("display_name", textVIds)
        .orWhereIn("variant_name", textVIds);
    });
  } else if (numericVIds.length > 0) {
    variantsQuery = variantsQuery.whereIn("id", numericVIds);
  } else if (textVIds.length > 0) {
    variantsQuery = variantsQuery.where(function () {
      this.whereIn("display_name", textVIds).orWhereIn("variant_name", textVIds);
    });
  }

  const variants = vIds.length > 0 ? await variantsQuery.select("id", "display_name", "variant_name", "base_price") : [];

  const variantById = new Map();
  const variantByName = new Map();
  for (const v of variants) {
    variantById.set(Number(v.id), v);
    if (v.display_name) variantByName.set(String(v.display_name).toLowerCase().trim(), v);
    if (v.variant_name) variantByName.set(String(v.variant_name).toLowerCase().trim(), v);
  }

  const variantIds = variants.map((v) => v.id);
  const prices = variantIds.length > 0
    ? await queryDb(TABLES.VARIANT_PRICE).whereIn("variant_id", variantIds)
    : [];

  const priceMap = new Map();
  for (const p of prices) {
    priceMap.set(`${p.variant_id}_${p.tier_id}`, Number(p.price || 0));
  }

  return orders.map((order) => {
    const prefix = getOrderPrefix(order.id_order);
    if (prefix === "MAVT") {
      return { ...order, orderPrefix: prefix, catalogBasePrice: 0 };
    }

    const pId = Number(order.id_product);
    let matchedVariant = !isNaN(pId) && pId > 0 ? variantById.get(pId) : null;
    if (!matchedVariant && order.id_product) {
      matchedVariant = variantByName.get(String(order.id_product).toLowerCase().trim());
    }

    let catalogPrice = 0;
    if (matchedVariant) {
      const vId = matchedVariant.id;
      const ctv = priceMap.get(`${vId}_1`) || 0;
      const retail = priceMap.get(`${vId}_2`) || 0;
      const promo = priceMap.get(`${vId}_3`) || 0;
      const student = priceMap.get(`${vId}_4`) || 0;
      const base = Number(matchedVariant.base_price || 0);

      if (prefix === "MAVC") {
        catalogPrice = ctv > 0 ? ctv : (retail > 0 ? retail : base);
      } else if (prefix === "MAVL") {
        catalogPrice = retail > 0 ? retail : (ctv > 0 ? ctv : base);
      } else if (prefix === "MAVK") {
        catalogPrice = promo > 0 ? promo : (retail > 0 ? retail : base);
      } else if (prefix === "MAVS") {
        catalogPrice = student > 0 ? student : (ctv > 0 ? ctv : (retail > 0 ? retail : base));
      } else {
        catalogPrice = retail > 0 ? retail : base;
      }
    }

    if (!catalogPrice || catalogPrice <= 0) {
      catalogPrice = Number(order.gross_selling_price || order.price || 0);
    }

    return {
      ...order,
      orderPrefix: prefix,
      display_name: matchedVariant?.display_name || order.display_name || null,
      variant_name: matchedVariant?.variant_name || null,
      catalogBasePrice: catalogPrice,
    };
  });
}

/**
 * Lấy Suffix khả dụng hiện tại để preview trên UI
 */
async function getBatchSuffixPreview() {
  const suffix = await getAvailableSuffix();
  const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10).replace(/-/g, "");
  const previewBatchCode = `MBP-${todayStr}-S${suffix}`;
  return { suffix, previewBatchCode };
}

/**
 * Tạo một đợt gộp đơn thanh toán mới (Pending Batch)
 * Bọc trong Transaction + Advisory Lock chống race-condition.
 * Kiểm tra đơn trùng trong batch PENDING: nếu có cờ forceCancelOldBatches thì tự động hủy batch cũ.
 */
async function createBatchPaymentRequest({
  orderCodes = [],
  financialAccountId = null,
  customerName = null,
  note = "",
  created_by = "ADMIN",
  forceCancelOldBatches = false,
} = {}) {
  const codes = Array.isArray(orderCodes)
    ? Array.from(new Set(orderCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean)))
    : [];

  if (codes.length === 0) {
    throw new Error("Vui lòng chọn ít nhất 1 mã đơn hàng hợp lệ để tạo đợt gộp.");
  }

  return withTransaction(async (trx) => {
    // 0. Khóa Advisory Lock cấp Transaction để chống cấp trùng suffix đồng thời
    await trx.raw("SELECT pg_advisory_xact_lock(?)", [BATCH_ADVISORY_LOCK_ID]);

    // 1. Kiểm tra danh sách đơn hàng
    const orders = await trx(TABLES.ORDER_LIST)
      .whereIn("id_order", codes)
      .forUpdate();

    if (orders.length !== codes.length) {
      const foundCodes = new Set(orders.map((o) => o.id_order));
      const missing = codes.filter((c) => !foundCodes.has(c));
      throw new Error(`Không tìm thấy các đơn hàng: ${missing.join(", ")}`);
    }

    const invalidOrders = orders.filter((o) => !PAYABLE_STATUSES.includes(o.status));
    if (invalidOrders.length > 0) {
      const invalidDetails = invalidOrders.map((o) => `${o.id_order} (${o.status})`).join(", ");
      throw new Error(`Các đơn sau không ở trạng thái chờ thanh toán: ${invalidDetails}`);
    }

    // 2. Kiểm tra xem có đơn nào đang nằm trong batch PENDING còn hiệu lực không
    const activeBatches = await trx(TABLES.BATCH_PAYMENT_REQUESTS)
      .where("status", "PENDING")
      .andWhere("expires_at", ">=", trx.fn.now())
      .forUpdate();

    const conflictingBatches = [];
    for (const b of activeBatches) {
      const bCodes = Array.isArray(b.order_codes) ? b.order_codes : JSON.parse(b.order_codes || "[]");
      const overlap = codes.filter((c) => bCodes.includes(c));
      if (overlap.length > 0) {
        conflictingBatches.push({ batch: b, overlapCodes: overlap });
      }
    }

    if (conflictingBatches.length > 0) {
      if (forceCancelOldBatches) {
        // Tự động hủy các batch cũ theo chỉ đạo của Master
        for (const item of conflictingBatches) {
          await trx(TABLES.BATCH_PAYMENT_REQUESTS)
            .where({ id: item.batch.id })
            .update({
              status: "CANCELED",
              note: `${item.batch.note ? item.batch.note + " | " : ""}Tự động hủy để tạo đợt gộp mới chứa đơn ${item.overlapCodes.join(", ")}`,
              updated_at: trx.fn.now(),
            });
        }
      } else {
        const details = conflictingBatches
          .map((c) => `Đơn [${c.overlapCodes.join(", ")}] thuộc đợt gộp #${c.batch.batch_code}`)
          .join("; ");
        const err = new Error(
          `Phát hiện đơn hàng đang nằm trong đợt gộp cũ: ${details}. Bạn có muốn hủy đợt gộp cũ để tạo đợt gộp mới này không?`
        );
        err.code = "CONFLICTING_BATCH";
        err.conflictingBatches = conflictingBatches.map((c) => ({
          id: c.batch.id,
          batch_code: c.batch.batch_code,
          overlapCodes: c.overlapCodes,
        }));
        throw err;
      }
    }

    // 3. Tra cứu giá gốc CHUẨN TỪNG ĐƠN theo prefix (MAVL, MAVC, MAVK, MAVS)
    const enrichedOrders = await resolveOrdersWithCatalogPrices(trx, orders);

    // 4. Tính tổng tiền gốc đợt gộp (Tuyệt đối không làm tròn số học)
    const baseAmount = enrichedOrders.reduce((sum, o) => sum + Number(o.catalogBasePrice || 0), 0);

    if (baseAmount <= 0) {
      throw new Error("Tổng tiền các đơn hàng phải lớn hơn 0 ₫.");
    }

    // 5. Cấp phát slot suffix độc nhất (1..100) bên trong Transaction
    const slotSuffix = await getAvailableSuffix(trx);
    const totalAmount = baseAmount + Number(slotSuffix);

    // 6. Sinh mã batch độc nhất: MBP-YYYYMMDD-XXXX
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const batchCode = `MBP-${todayStr}-${randomHex}`;

    // 7. Xác định tên khách hàng đại diện
    let resolvedCustomer = customerName ? String(customerName).trim() : null;
    if (!resolvedCustomer) {
      const customers = Array.from(new Set(orders.map((o) => o.customer).filter(Boolean)));
      if (customers.length === 1) {
        resolvedCustomer = customers[0];
      } else if (customers.length > 1) {
        resolvedCustomer = `${customers[0]} (+${customers.length - 1} khách)`;
      }
    }

    // 8. Bóc tách danh sách order_allocations để Webhook dùng đúng chuẩn từng đồng
    const orderAllocations = enrichedOrders.map((o) => ({
      orderCode: o.id_order,
      orderId: o.id,
      orderPrefix: o.orderPrefix,
      basePrice: Number(o.catalogBasePrice || 0),
      customer: o.customer || null,
      displayName: o.display_name || null,
    }));

    // Hạn thanh toán: 72 giờ
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const [inserted] = await trx(TABLES.BATCH_PAYMENT_REQUESTS)
      .insert({
        batch_code: batchCode,
        order_codes: JSON.stringify(codes),
        order_ids: JSON.stringify(orders.map((o) => o.id)),
        order_allocations: JSON.stringify(orderAllocations),
        base_amount: baseAmount,
        slot_suffix: slotSuffix,
        total_amount: totalAmount,
        financial_account_id: financialAccountId ? Number(financialAccountId) : null,
        customer_name: resolvedCustomer,
        status: "PENDING",
        note: note ? String(note).trim() : null,
        created_by: created_by || "ADMIN",
        expires_at: expiresAt,
      })
      .returning("*");

    return {
      batch: inserted,
      orders: enrichedOrders.map((o) => ({
        id: o.id,
        id_order: o.id_order,
        orderPrefix: o.orderPrefix,
        customer: o.customer,
        information_order: o.information_order,
        display_name: o.display_name,
        variant_name: o.variant_name,
        catalogBasePrice: o.catalogBasePrice,
        price: Number(o.price || 0),
        status: o.status,
      })),
    };
  });
}

/**
 * Tự động loại trừ một đơn hàng ra khỏi các đợt gộp PENDING còn hiệu lực
 * Dùng khi đơn con được thanh toán riêng hoặc đơn con bị hết hạn / hủy.
 * @param {import("knex").Knex.Transaction | import("knex").Knex} trxContext
 * @param {string} orderCode - Mã đơn hàng cần loại trừ
 * @param {string} reason - Lý do loại trừ (VD: "Đã thanh toán riêng", "Đơn đã hết hạn")
 */
async function excludeOrderFromPendingBatches(trxContext, orderCode, reason = "") {
  if (!orderCode) return;
  const cleanCode = String(orderCode).trim().toUpperCase();
  const queryDb = trxContext || db;
  const nowVal = queryDb?.fn?.now ? queryDb.fn.now() : (db?.fn?.now ? db.fn.now() : new Date());

  try {
    // 1. Tìm các batch PENDING có chứa mã đơn này
    const pendingBatches = await queryDb(TABLES.BATCH_PAYMENT_REQUESTS)
      .where("status", "PENDING")
      .andWhere("expires_at", ">=", nowVal)
      .forUpdate();

    for (const batch of pendingBatches) {
      const codes = Array.isArray(batch.order_codes)
        ? batch.order_codes
        : JSON.parse(batch.order_codes || "[]");

      if (!codes.includes(cleanCode)) continue;

      const remainingCodes = codes.filter((c) => c !== cleanCode);
      const allocations = Array.isArray(batch.order_allocations)
        ? batch.order_allocations
        : JSON.parse(batch.order_allocations || "[]");

      // Nếu không còn đơn nào trong đợt gộp -> Hủy đợt gộp để giải phóng suffix
      if (remainingCodes.length === 0) {
        await queryDb(TABLES.BATCH_PAYMENT_REQUESTS)
          .where({ id: batch.id })
          .update({
            status: "CANCELED",
            note: `${batch.note ? batch.note + " | " : ""}Tự động hủy vì toàn bộ đơn đã được giải phóng (${reason}: ${cleanCode})`,
            updated_at: nowVal,
          });
        continue;
      }

      // Nếu vẫn còn các đơn khác -> Cập nhật lại số tiền đợt gộp
      const remainingAllocations = allocations.filter((a) => a.orderCode !== cleanCode);
      const newBaseAmount = remainingAllocations.reduce((sum, a) => sum + Number(a.basePrice || 0), 0);
      const slotSuffix = Number(batch.slot_suffix || 0);
      const newTotalAmount = newBaseAmount + slotSuffix;

      const orderIds = Array.isArray(batch.order_ids)
        ? batch.order_ids
        : JSON.parse(batch.order_ids || "[]");
      const remainingIds = remainingAllocations.map((a) => a.orderId).filter(Boolean);

      await queryDb(TABLES.BATCH_PAYMENT_REQUESTS)
        .where({ id: batch.id })
        .update({
          order_codes: JSON.stringify(remainingCodes),
          order_ids: JSON.stringify(remainingIds),
          order_allocations: JSON.stringify(remainingAllocations),
          base_amount: newBaseAmount,
          total_amount: newTotalAmount,
          note: `${batch.note ? batch.note + " | " : ""}Tự động loại trừ đơn ${cleanCode} (${reason})`,
          updated_at: nowVal,
        });
    }
  } catch (err) {
    console.warn(`[BatchPayment] Lỗi khi loại trừ đơn ${cleanCode} khỏi batch:`, err.message);
  }
}

/**
 * Lấy danh sách các đợt gộp đơn (Mặc định PENDING)
 */
async function getBatchPaymentRequests({ page = 1, limit = 20, status = "PENDING" } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  try {
    await db(TABLES.BATCH_PAYMENT_REQUESTS)
      .where("status", "PENDING")
      .andWhere("expires_at", "<", db.fn.now())
      .update({ status: "EXPIRED", updated_at: db.fn.now() });
  } catch (err) {
    console.warn("[BatchPayment] Không thể cập nhật EXPIRED tự động:", err.message);
  }

  let query = db(TABLES.BATCH_PAYMENT_REQUESTS)
    .leftJoin(
      TABLES.FINANCIAL_ACCOUNTS,
      `${TABLES.BATCH_PAYMENT_REQUESTS}.financial_account_id`,
      `${TABLES.FINANCIAL_ACCOUNTS}.id`
    )
    .select(
      `${TABLES.BATCH_PAYMENT_REQUESTS}.*`,
      `${TABLES.FINANCIAL_ACCOUNTS}.account_number as bank_account_number`,
      `${TABLES.FINANCIAL_ACCOUNTS}.account_holder as bank_account_holder`,
      `${TABLES.FINANCIAL_ACCOUNTS}.bank_short_code as bank_short_code`,
      `${TABLES.FINANCIAL_ACCOUNTS}.bank_display_name as bank_display_name`
    );

  if (status && status !== "ALL") {
    query = query.where(`${TABLES.BATCH_PAYMENT_REQUESTS}.status`, status);
  }

  const [countRes] = await (status && status !== "ALL"
    ? db(TABLES.BATCH_PAYMENT_REQUESTS).where({ status }).count("id as count")
    : db(TABLES.BATCH_PAYMENT_REQUESTS).count("id as count"));

  const total = Number(countRes?.count || 0);

  const data = await query
    .orderBy(`${TABLES.BATCH_PAYMENT_REQUESTS}.id`, "desc")
    .limit(limitNum)
    .offset(offset);

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Lấy chi tiết một đợt gộp đơn kèm danh sách các đơn con được làm giàu giá gốc bảng giá
 */
async function getBatchPaymentDetail(batchIdOrCode) {
  let query = db(TABLES.BATCH_PAYMENT_REQUESTS)
    .leftJoin(
      TABLES.FINANCIAL_ACCOUNTS,
      `${TABLES.BATCH_PAYMENT_REQUESTS}.financial_account_id`,
      `${TABLES.FINANCIAL_ACCOUNTS}.id`
    )
    .select(
      `${TABLES.BATCH_PAYMENT_REQUESTS}.*`,
      `${TABLES.FINANCIAL_ACCOUNTS}.account_number as bank_account_number`,
      `${TABLES.FINANCIAL_ACCOUNTS}.account_holder as bank_account_holder`,
      `${TABLES.FINANCIAL_ACCOUNTS}.bank_short_code as bank_short_code`,
      `${TABLES.FINANCIAL_ACCOUNTS}.bank_display_name as bank_display_name`,
      `${TABLES.FINANCIAL_ACCOUNTS}.bank_bin as bank_bin`
    );

  const numId = Number(batchIdOrCode);
  if (!isNaN(numId) && numId > 0) {
    query = query.where(`${TABLES.BATCH_PAYMENT_REQUESTS}.id`, numId);
  } else {
    query = query.where(`${TABLES.BATCH_PAYMENT_REQUESTS}.batch_code`, String(batchIdOrCode).trim());
  }

  const batch = await query.first();
  if (!batch) {
    throw new Error("Không tìm thấy đợt gộp thanh toán.");
  }

  const orderCodes = Array.isArray(batch.order_codes)
    ? batch.order_codes
    : JSON.parse(batch.order_codes || "[]");

  const rawOrders = await db(TABLES.ORDER_LIST)
    .whereIn("id_order", orderCodes)
    .orderBy("id", "asc");

  const enrichedOrders = await resolveOrdersWithCatalogPrices(db, rawOrders);

  const bankCode = batch.bank_short_code || batch.bank_bin || "ICB";
  const accNum = batch.bank_account_number || "";
  const accName = batch.bank_account_holder || "";
  const amount = Math.round(Number(batch.total_amount || 0));
  const vietqrUrl = accNum
    ? `https://img.vietqr.io/image/${bankCode}-${accNum}-compact2.png?amount=${amount}&accountName=${encodeURIComponent(accName)}`
    : "";

  return {
    batch,
    orders: enrichedOrders.map((o) => ({
      id: o.id,
      id_order: o.id_order,
      orderPrefix: o.orderPrefix,
      customer: o.customer,
      information_order: o.information_order,
      display_name: o.display_name,
      variant_name: o.variant_name,
      catalogBasePrice: o.catalogBasePrice,
      price: Number(o.price || 0),
      status: o.status,
      order_date: o.order_date,
      expired_at: o.expired_at,
    })),
    bank: {
      bank_display_name: batch.bank_display_name,
      bank_short_code: batch.bank_short_code,
      account_number: batch.bank_account_number,
      account_holder: batch.bank_account_holder,
    },
    vietqr_url: vietqrUrl,
  };
}

/**
 * Hủy một đợt gộp đơn đang chờ để giải phóng Slot Suffix
 */
async function cancelBatchPaymentRequest(id, reason = "") {
  const batchId = Number(id);
  if (!batchId || isNaN(batchId)) {
    throw new Error("ID đợt gộp không hợp lệ.");
  }

  const batch = await db(TABLES.BATCH_PAYMENT_REQUESTS).where({ id: batchId }).first();
  if (!batch) {
    throw new Error("Không tìm thấy đợt gộp thanh toán.");
  }

  if (batch.status !== "PENDING") {
    throw new Error(`Đợt gộp đang ở trạng thái ${batch.status}, không thể hủy.`);
  }

  const cancelNote = reason
    ? `${batch.note ? batch.note + " | " : ""}Hủy bởi admin: ${reason}`
    : batch.note;

  await db(TABLES.BATCH_PAYMENT_REQUESTS)
    .where({ id: batchId })
    .update({
      status: "CANCELED",
      note: cancelNote,
      updated_at: db.fn.now(),
    });

  return {
    success: true,
    message: `Đã hủy đợt gộp #${batch.batch_code} và giải phóng Slot Suffix +${batch.slot_suffix}đ.`,
  };
}

module.exports = {
  getOrderPrefix,
  resolveOrdersWithCatalogPrices,
  getBatchSuffixPreview,
  createBatchPaymentRequest,
  excludeOrderFromPendingBatches,
  getBatchPaymentRequests,
  getBatchPaymentDetail,
  cancelBatchPaymentRequest,
};
