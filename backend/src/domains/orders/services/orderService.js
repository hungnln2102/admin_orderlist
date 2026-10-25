const { db, TABLES, COLS, withTransaction } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { getAvailableSuffix, applySuffixToPrice } = require("@/domains/payments/services/slotSuffixService");
const { ORDER_STATUS, getOrderStatusLabel } = require("@/constants/orderStatus");
const { isRenewalOrder, calculateNewExpiry } = require("./orderPaymentService");

const O_COLS = COLS.ORDER_LIST;
const getOrderTable = (trx) => (trx || db)(TABLES.ORDER_LIST);
const emitOrderEvent = (trx, eventName, payload) => {
  if (typeof trx?.afterCommit === "function") {
    trx.afterCommit(() => eventBus.emit(eventName, payload));
    return;
  }
  eventBus.emit(eventName, payload);
};

const isCustomerMavryk = (c) => String(c || "").trim().toLowerCase() === "mavryk";

// In-memory cache for default shop bank account (1 minute TTL)
let cachedDefaultBank = null;
let cachedBankTimestamp = 0;
const BANK_CACHE_TTL_MS = 60 * 1000;

async function getDefaultShopBank(trx) {
  const now = Date.now();
  if (cachedDefaultBank && now - cachedBankTimestamp < BANK_CACHE_TTL_MS) {
    return cachedDefaultBank;
  }
  const queryDb = trx || db;
  let defaultBank = await queryDb(TABLES.SHOP_BANK_ACCOUNTS).where({ is_default: true, is_active: true }).first();
  if (!defaultBank) {
    defaultBank = await queryDb(TABLES.SHOP_BANK_ACCOUNTS).where({ is_active: true }).first();
  }
  if (!defaultBank) {
    defaultBank = await queryDb(TABLES.SHOP_BANK_ACCOUNTS).first();
  }
  if (defaultBank) {
    cachedDefaultBank = defaultBank;
    cachedBankTimestamp = now;
  }
  return defaultBank;
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

async function createRefundCreditNoteForCanceledOrder(trx, order, refundAmount, canceledAt) {
  if (!refundAmount || refundAmount <= 0) return;
  if (String(order.id_order || "").toUpperCase().startsWith("MAVN") || isCustomerMavryk(order.customer)) return;

  const creditCode = `RFC-${order.id_order || "ORDER"}-${order.id}`;
  await trx(TABLES.REFUND_CREDIT_NOTES)
    .insert({
      credit_code: creditCode,
      source_order_list_id: order.id,
      source_order_code: order.id_order,
      customer_name: order.customer || "Khách hàng",
      customer_contact: order.contact || "",
      refund_amount: refundAmount,
      available_amount: refundAmount,
      status: "OPEN",
      note: `Tự động tạo credit khi hủy đơn #${order.id_order} vào ngày ${canceledAt}`,
      source_kind: "ORDER_REFUND",
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })
    .onConflict("credit_code")
    .ignore();
}

const VALID_ORDER_PREFIXES = ["MAVC", "MAVL", "MAVN", "MAVK", "MAVS", "MAVT"];

/**
 * Trích xuất mã đơn ngẫu nhiên chuẩn tiền tố (MAVN, MAVC, MAVL...)
 */
function generateOrderCode(prefix = "MAVC") {
  const normalizedPrefix = VALID_ORDER_PREFIXES.includes(String(prefix || "").toUpperCase())
    ? String(prefix).toUpperCase()
    : "MAVC";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${normalizedPrefix}${random}`;
}

function applyCanceledFilter(builder) {
  builder.where(function(b) {
    b.whereIn("status", [ORDER_STATUS.REFUND_PENDING, ORDER_STATUS.REFUNDED])
     .orWhere(function(sub) {
       sub.where("status", ORDER_STATUS.CANCELED)
          .where("was_paid", true);
     });
  });
}

function applyExpiredFilter(builder) {
  builder.whereNot(applyCanceledFilter)
    .where("status", ORDER_STATUS.EXPIRED);
}

function applyImportFilter(builder) {
  builder.whereNot(applyCanceledFilter)
    .whereNot(applyExpiredFilter)
    .whereILike("id_order", "MAVN%");
}

function applyActiveFilter(builder) {
  builder.whereNot(applyCanceledFilter)
    .whereNot(applyExpiredFilter)
    .whereNot((b) => {
      b.whereILike("id_order", "MAVN%");
    });
}

/**
 * Lấy danh sách đơn hàng có phân trang, lọc theo tab & tìm kiếm (Tối ưu SQL Aggregation)
 */
async function getOrders({ page = 1, limit = 20, search = "", status = "", tab = "" } = {}) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (page - 1) * limit;

  // 1. Tính toán tabCounts song song trên toàn bộ cơ sở dữ liệu (Tối ưu Promise.all)
  const [[canceledRes], [expiredRes], [importRes], [activeRes]] = await Promise.all([
    getOrderTable().where(applyCanceledFilter).count("id as count"),
    getOrderTable().where(applyExpiredFilter).count("id as count"),
    getOrderTable().where(applyImportFilter).count("id as count"),
    getOrderTable().where(applyActiveFilter).count("id as count"),
  ]);

  const tabCounts = {
    active: Number(activeRes?.count || 0),
    import: Number(importRes?.count || 0),
    expired: Number(expiredRes?.count || 0),
    canceled: Number(canceledRes?.count || 0),
  };

  // 2. Truy vấn danh sách đơn thuộc tab hiện tại
  let query = getOrderTable();

  if (tab === "canceled") {
    query = query.where(applyCanceledFilter);
  } else if (tab === "expired") {
    query = query.where(applyExpiredFilter);
  } else if (tab === "import") {
    query = query.where(applyImportFilter);
  } else if (tab === "active") {
    query = query.where(applyActiveFilter);
  }

  if (status && status !== "ALL") {
    query = query.where("status", status);
  }

  if (search) {
    query = query.where((builder) => {
      builder
        .whereILike("id_order", `%${search}%`)
        .orWhereILike("customer", `%${search}%`)
        .orWhereILike("contact", `%${search}%`)
        .orWhereILike("information_order", `%${search}%`);
    });
  }

  const [countResult] = await query.clone().count("id as total");
  const total = Number(countResult?.total || 0);

  // 3. SQL Aggregation trực tiếp trong PostgreSQL (Tối ưu tốc độ, không kéo all rows về Node RAM)
  const todayStr = new Date().toISOString().split("T")[0];

  const [summaryRow] = await query.clone().select(
    db.raw(`
      COALESCE(SUM(price), 0)::numeric as "totalRevenue",
      COALESCE(SUM(cost), 0)::numeric as "totalCost",
      COALESCE(SUM(
        CASE 
          WHEN status = '${ORDER_STATUS.REFUND_PENDING}' THEN price 
          ELSE 0 
        END
      ), 0)::numeric as "refundCustomerAmount",
      COALESCE(SUM(
        CASE 
          WHEN status IN ('${ORDER_STATUS.REFUNDED}', '${ORDER_STATUS.CANCELED}') THEN price 
          ELSE 0 
        END
      ), 0)::numeric as "refundedCustomerAmount",
      COALESCE(SUM(
        CASE 
          WHEN status IN ('${ORDER_STATUS.REFUND_PENDING}', '${ORDER_STATUS.REFUNDED}', '${ORDER_STATUS.CANCELED}') THEN cost 
          ELSE 0 
        END
      ), 0)::numeric as "refundSupplierAmount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.PAID}'
      ) as "paidCount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.RENEW_REQUIRED}'
      ) as "renewCount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.UNPAID}'
      ) as "pendingCount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.REFUND_PENDING}'
      ) as "pendingRefundCount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.REFUNDED}'
      ) as "refundedCount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.CANCELED}'
      ) as "canceledCount",
      COUNT(*) FILTER (
        WHERE order_date::text LIKE '${todayStr}%' OR created_at::text LIKE '${todayStr}%'
      ) as "todayCount"
    `)
  );

  // Tính toán remaining values dựa trên SQL
  const [remRow] = await query.clone().select(
    db.raw(`
      COALESCE(SUM(
        CASE 
          WHEN status NOT IN ('${ORDER_STATUS.CANCELED}', '${ORDER_STATUS.REFUNDED}', '${ORDER_STATUS.REFUND_PENDING}') AND expired_at > CURRENT_DATE
          THEN ROUND((price::numeric / GREATEST(COALESCE(NULLIF(days::numeric, 0), 365), 1)) * GREATEST((expired_at::date - CURRENT_DATE), 0))
          ELSE 0 
        END
      ), 0)::numeric as "totalRemainingValue",
      COALESCE(SUM(
        CASE 
          WHEN status NOT IN ('${ORDER_STATUS.CANCELED}', '${ORDER_STATUS.REFUNDED}', '${ORDER_STATUS.REFUND_PENDING}') AND expired_at > CURRENT_DATE
          THEN ROUND((cost::numeric / GREATEST(COALESCE(NULLIF(days::numeric, 0), 365), 1)) * GREATEST((expired_at::date - CURRENT_DATE), 0))
          ELSE 0 
        END
      ), 0)::numeric as "supplierRemainingValue"
    `)
  );

  const summary = {
    totalRevenue: Number(summaryRow?.totalRevenue || 0),
    totalCost: Number(summaryRow?.totalCost || 0),
    totalRemainingValue: Number(remRow?.totalRemainingValue || 0),
    supplierRemainingValue: Number(remRow?.supplierRemainingValue || 0),
    refundCustomerAmount: Number(summaryRow?.refundCustomerAmount || 0),
    refundedCustomerAmount: Number(summaryRow?.refundedCustomerAmount || 0),
    refundSupplierAmount: Number(summaryRow?.refundSupplierAmount || 0),
    paidCount: Number(summaryRow?.paidCount || 0),
    renewCount: Number(summaryRow?.renewCount || 0),
    processingCount: Number(summaryRow?.processingCount || 0),
    pendingCount: Number(summaryRow?.pendingCount || 0),
    pendingRefundCount: Number(summaryRow?.pendingRefundCount || 0),
    refundedCount: Number(summaryRow?.refundedCount || 0),
    canceledCount: Number(summaryRow?.canceledCount || 0),
    todayCount: Number(summaryRow?.todayCount || 0),
    totalOrders: total,
  };

  const orders = await query
    .select("*")
    .orderByRaw(`
      CASE
        WHEN status = '${ORDER_STATUS.UNPAID}' THEN 1
        WHEN status = '${ORDER_STATUS.RENEW_REQUIRED}' THEN 2
        ELSE 3
      END,
      id DESC
    `)
    .limit(limit)
    .offset(offset);

  const enrichedOrders = await attachBatchSupplierAndQrInfo(orders);

  return {
    data: enrichedOrders,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
    tabCounts,
    summary,
  };
}

async function resolveSupplyId(trx, supplyInput) {
  if (!supplyInput) return null;
  const num = Number(supplyInput);
  if (!isNaN(num) && num > 0) {
    const foundById = await trx(TABLES.SUPPLIER).where({ id: num }).first();
    if (foundById) return foundById.id;
  }
  const foundByName = await trx(TABLES.SUPPLIER)
    .whereILike(COLS.SUPPLIER.SUPPLIER_NAME, String(supplyInput).trim())
    .first();
  if (foundByName) return foundByName.id;
  return null;
}

/**
 * Tối ưu hóa truy vấn hàng loạt (Batch Loader): Nạp toàn bộ thông tin NCC và VietQR 
 * cho danh sách đơn hàng chỉ bằng 1-2 queries (Loại bỏ triệt để lỗi N+1 Query).
 */
async function attachBatchSupplierAndQrInfo(orders, trx) {
  if (!orders || orders.length === 0) return [];
  const queryDb = trx || db;

  // 1. Gom các đơn chưa có supply_id để truy vấn bảng log chi phí NCC trong 1 query duy nhất
  const ordersWithoutSupplyId = orders.filter((o) => !o.supply_id).map((o) => o.id);
  const logSupplyMap = new Map();
  if (ordersWithoutSupplyId.length > 0) {
    const logs = await queryDb(TABLES.SUPPLIER_ORDER_COST_LOG)
      .whereIn("order_list_id", ordersWithoutSupplyId)
      .select("order_list_id", "supply_id");
    for (const l of logs) {
      if (l.order_list_id && l.supply_id) {
        logSupplyMap.set(Number(l.order_list_id), Number(l.supply_id));
      }
    }
  }

  // 2. Gom danh sách tất cả unique supply_ids cần nạp
  const neededSupplyIds = new Set();
  for (const o of orders) {
    const sId = o.supply_id || logSupplyMap.get(Number(o.id));
    if (sId) {
      const num = Number(sId);
      if (!isNaN(num) && num > 0) neededSupplyIds.add(num);
    }
  }

  // 3. Truy vấn nạp danh sách NCC trong 1 query duy nhất
  const supplierMap = new Map();
  if (neededSupplyIds.size > 0) {
    const suppliers = await queryDb(TABLES.SUPPLIER)
      .whereIn("id", Array.from(neededSupplyIds))
      .select("id", COLS.SUPPLIER.SUPPLIER_NAME, "number_bank", "bin_bank", "account_holder");
    for (const s of suppliers) {
      supplierMap.set(Number(s.id), s);
    }
  }

  // 3b. Gom danh sách tất cả unique variantIds (id_product) cần nạp
  const neededVariantIds = new Set();
  for (const o of orders) {
    if (o.id_product) {
      const num = Number(o.id_product);
      if (!isNaN(num) && num > 0) neededVariantIds.add(num);
    }
  }

  // 3c. Truy vấn nạp danh sách variant trong 1 query duy nhất
  const variantMap = new Map();
  if (neededVariantIds.size > 0) {
    const variants = await queryDb(TABLES.VARIANT)
      .whereIn("id", Array.from(neededVariantIds))
      .select("id", "variant_name", "display_name", "product_id");
    for (const v of variants) {
      variantMap.set(Number(v.id), v);
    }
  }

  // 4. Lấy tài khoản ngân hàng mặc định của shop (đã có in-memory cache)
  const defaultBank = await getDefaultShopBank(trx);
  let defaultShopBankInfo = null;
  if (defaultBank) {
    const accNum = defaultBank.account_number || defaultBank.accountNumber;
    const bin = defaultBank.bank_bin || defaultBank.bankBin || defaultBank.bank_short_code || defaultBank.bankShortCode || "MB";
    const accName = defaultBank.account_holder || defaultBank.accountHolder || "";
    if (accNum) {
      defaultShopBankInfo = {
        bin,
        accNum,
        accName,
        bankName: defaultBank.bank_display_name || defaultBank.bankShortCode || bin,
      };
    }
  }

  // 5. Gắn thông tin hoàn toàn in-memory (0 extra queries)
  return orders.map((order) => {
    const resolvedSupplyId = order.supply_id || logSupplyMap.get(Number(order.id)) || null;
    const numSupplyId = Number(resolvedSupplyId);
    const supplier = !isNaN(numSupplyId) ? supplierMap.get(numSupplyId) : null;
    const supplierName = supplier ? (supplier[COLS.SUPPLIER.SUPPLIER_NAME] || supplier.ncc_name || "") : "";

    const vId = Number(order.id_product);
    const matchedVariant = !isNaN(vId) ? variantMap.get(vId) : null;
    const variantName = matchedVariant ? matchedVariant.variant_name : (order.id_product && isNaN(vId) ? String(order.id_product) : null);
    const displayName = matchedVariant ? matchedVariant.display_name : null;

    const enriched = {
      ...order,
      supply_id: resolvedSupplyId,
      supplier_name: supplierName,
      variant_name: variantName,
      display_name: displayName,
    };

    const isImport = String(order.id_order || "").toUpperCase().startsWith("MAVN") || 
      (Number(order.cost || 0) > 0 && String(order.status || "").toLowerCase().includes("nhập hàng"));

    if (isImport && supplier && (supplier.number_bank || supplier.numberBank)) {
      const bin = supplier.bin_bank || supplier.binBank || "970422";
      const accNum = supplier.number_bank || supplier.numberBank;
      const accName = supplier.account_holder || supplier.accountHolder || supplier.supplier_name || "";
      const amount = Math.round(Number(order.cost || order.price || 0));
      enriched.vietqr_url = `https://img.vietqr.io/image/${bin}-${accNum}-compact2.png?amount=${amount}&accountName=${encodeURIComponent(accName)}`;
      enriched.bank_info = {
        bank_name: supplier.bin_bank || bin,
        account_number: accNum,
        account_holder: accName,
        type: "supplier",
      };
    } else if (defaultShopBankInfo) {
      const amount = Math.round(Number(order.price || 0));
      enriched.vietqr_url = `https://img.vietqr.io/image/${defaultShopBankInfo.bin}-${defaultShopBankInfo.accNum}-compact2.png?amount=${amount}&accountName=${encodeURIComponent(defaultShopBankInfo.accName)}`;
      enriched.bank_info = {
        bank_name: defaultShopBankInfo.bankName,
        account_number: defaultShopBankInfo.accNum,
        account_holder: defaultShopBankInfo.accName,
        type: "shop",
      };
    }

    return enriched;
  });
}

async function attachSupplierInfo(order, trx) {
  if (!order) return order;
  try {
    const queryDb = trx || db;
    let supplyId = order.supply_id;
    if (!supplyId) {
      const log = await queryDb(TABLES.SUPPLIER_ORDER_COST_LOG)
        .where({ order_list_id: order.id })
        .first();
      if (log && log.supply_id) {
        supplyId = log.supply_id;
      }
    }

    let supplierName = "";
    if (supplyId) {
      const supplier = await queryDb(TABLES.SUPPLIER)
        .where({ id: Number(supplyId) })
        .first();
      if (supplier) {
        supplierName = supplier[COLS.SUPPLIER.SUPPLIER_NAME] || "";
      }
    }

    let variantName = null;
    let displayName = null;
    if (order.id_product) {
      const vId = Number(order.id_product);
      if (!isNaN(vId) && vId > 0) {
        const variant = await queryDb(TABLES.VARIANT).where({ id: vId }).first();
        if (variant) {
          variantName = variant.variant_name;
          displayName = variant.display_name;
        }
      } else {
        variantName = String(order.id_product);
      }
    }

    return {
      ...order,
      supply_id: supplyId || order.supply_id || null,
      supplier_name: supplierName,
      variant_name: variantName,
      display_name: displayName,
    };
  } catch (err) {
    console.error("[attachSupplierInfo] Lỗi:", err.message);
    return order;
  }
}

/**
 * Tự động gắn ảnh VietQR (vietqr_url) & thông tin ngân hàng cho đơn hàng (Có cache bank)
 */
async function attachVietQrToOrder(order, trx) {
  if (!order) return order;
  try {
    const isImport = String(order.id_order || "").toUpperCase().startsWith("MAVN") || (Number(order.cost || 0) > 0 && String(order.status || "").toLowerCase().includes("nhập hàng"));

    let numSupplyId = Number(order.supply_id);
    if (isImport && !isNaN(numSupplyId) && numSupplyId > 0) {
      const queryDb = trx || db;
      const supplier = await queryDb(TABLES.SUPPLIER)
        .where({ id: numSupplyId })
        .first();

      if (supplier && (supplier.number_bank || supplier.numberBank)) {
        const bin = supplier.bin_bank || supplier.binBank || "970422";
        const accNum = supplier.number_bank || supplier.numberBank;
        const accName = supplier.account_holder || supplier.accountHolder || supplier.supplier_name || supplier.supplierName || "";
        const amount = Math.round(Number(order.cost || order.price || 0));
        return {
          ...order,
          vietqr_url: `https://img.vietqr.io/image/${bin}-${accNum}-compact2.png?amount=${amount}&accountName=${encodeURIComponent(accName)}`,
          bank_info: {
            bank_name: supplier.bin_bank || bin,
            account_number: accNum,
            account_holder: accName,
            type: "supplier",
          },
        };
      }
    }

    // Default shop bank account for sales orders (cached)
    const defaultBank = await getDefaultShopBank(trx);
    if (defaultBank) {
      const accNum = defaultBank.account_number || defaultBank.accountNumber;
      const bin = defaultBank.bank_bin || defaultBank.bankBin || defaultBank.bank_short_code || defaultBank.bankShortCode || "MB";
      const accName = defaultBank.account_holder || defaultBank.accountHolder || "";
      const amount = Math.round(Number(order.price || 0));
      if (accNum) {
        return {
          ...order,
          vietqr_url: `https://img.vietqr.io/image/${bin}-${accNum}-compact2.png?amount=${amount}&accountName=${encodeURIComponent(accName)}`,
          bank_info: {
            bank_name: defaultBank.bank_display_name || defaultBank.bankShortCode || bin,
            account_number: accNum,
            account_holder: accName,
            type: "shop",
          },
        };
      }
    }
  } catch (err) {
    console.error("[attachVietQrToOrder] Lỗi khi tạo VietQR:", err.message);
  }
  return order;
}

/**
 * Lấy chi tiết đơn hàng theo ID
 */
async function getOrderById(id) {
  const order = await getOrderTable().where({ id: Number(id) }).first();
  return order ? await attachVietQrToOrder(order) : null;
}

/**
 * Tạo đơn hàng mới + phát event ORDER_CREATED (Bọc Transaction)
 */
async function createOrder(payload) {
  return await withTransaction(async (trx) => {
    const rawPrefix = String(payload.order_prefix || "").trim().toUpperCase();
    const isMavn = rawPrefix === "MAVN" || String(payload.id_order || "").toUpperCase().startsWith("MAVN");
    const effectivePrefix = isMavn ? "MAVN" : (VALID_ORDER_PREFIXES.includes(rawPrefix) ? rawPrefix : "MAVC");
    const id_order = payload.id_order || generateOrderCode(effectivePrefix);
    const rawPrice = Number(payload.price || 0);
    const status = payload.status || (isMavn ? ORDER_STATUS.PAID : ORDER_STATUS.UNPAID);

    let finalPrice = rawPrice;
    if (status === ORDER_STATUS.UNPAID || status === ORDER_STATUS.RENEW_REQUIRED) {
      if (rawPrice > 0) {
        const suffix = await getAvailableSuffix();
        finalPrice = applySuffixToPrice(rawPrice, suffix);
      }
    }

    const customerVal = payload.customer || (isMavn ? "Mavryk" : "Khách hàng");
    const isMavryk = isCustomerMavryk(customerVal);
    const rawCost = Number(payload.cost || 0);

    let finalCost = 0;
    if (isMavn) {
      finalCost = Number(payload.cost || payload.price || 0);
      finalPrice = 0;
    } else {
      finalCost = isMavryk ? 0 : rawCost;
    }

    const isPaid = status === ORDER_STATUS.PAID || isMavn || String(id_order).toUpperCase().startsWith("MAVN");
    const newOrderData = {
      id_order,
      customer: customerVal,
      contact: payload.contact || "",
      information_order: payload.information_order || "",
      slot: payload.slot || "",
      price: finalPrice,
      gross_selling_price: isMavn ? 0 : (payload.gross_selling_price != null ? Number(payload.gross_selling_price) : finalPrice),
      cost: finalCost,
      status: isMavn ? ORDER_STATUS.PAID : status,
      was_paid: isPaid,
      payment_method: payload.payment_method || "bank",
      note: payload.note || "",
      days: payload.days ? Number(payload.days) : 365,
      order_date: payload.order_date || null,
      expired_at: payload.expired_at || null,
      supply_id: await resolveSupplyId(trx, payload.supply_id),
      created_at: db.fn.now(),
    };

    if (payload.id_product != null && payload.id_product !== "") {
      const numProdId = Number(payload.id_product);
      if (!isNaN(numProdId) && numProdId > 0) {
        newOrderData.id_product = numProdId;
      } else {
        const matched = await trx(TABLES.VARIANT)
          .whereILike("display_name", String(payload.id_product))
          .orWhereILike("variant_name", String(payload.id_product))
          .first();
        if (matched) {
          newOrderData.id_product = matched.id;
        }
      }
    }

    const [createdOrder] = await getOrderTable(trx)
      .insert(newOrderData)
      .returning("*");

    const shouldSyncWarehouseOrPackage = isMavn || String(id_order).toUpperCase().startsWith("MAVN") || payload.save_to_package === true || payload.save_to_warehouse === true;
    if (shouldSyncWarehouseOrPackage) {
      try {
        const isSaveToWarehouse = payload.save_to_warehouse !== false;
        const isSaveToPackage = payload.save_to_package !== false;
        const accountUsername = payload.information_order 
          ? String(payload.information_order).trim().toLowerCase()
          : (payload.slot ? (payload.slot.split('|')[0] || payload.customer).trim().toLowerCase() : String(payload.customer || "mavryk").trim().toLowerCase());
        
        let productName = payload.information_order || "Dịch vụ";
        const prodIdToLookup = newOrderData.id_product || payload.id_product;
        if (prodIdToLookup) {
          try {
            const variantRow = await trx(TABLES.VARIANT)
              .leftJoin(TABLES.PRODUCT, `${TABLES.PRODUCT}.id`, `${TABLES.VARIANT}.product_id`)
              .select(
                `${TABLES.VARIANT}.display_name as variant_display`,
                `${TABLES.VARIANT}.variant_name as variant_name`,
                `${TABLES.PRODUCT}.package_name as parent_package_name`
              )
              .where(`${TABLES.VARIANT}.id`, Number(prodIdToLookup))
              .first();

            if (variantRow) {
              productName = variantRow.parent_package_name || variantRow.variant_name || variantRow.variant_display || productName;
            }
          } catch (e) {
            console.log("[OrderService] Không resolve được sản phẩm chính cho kho:", e.message);
          }
        }
        
        let pName = await trx(TABLES.PRODUCT_NAMES)
          .whereRaw("LOWER(name) = ?", [productName.toLowerCase().trim()])
          .first();

        let nameId = pName?.id;
        if (!nameId && (isSaveToWarehouse || isSaveToPackage)) {
          const [insertedP] = await trx(TABLES.PRODUCT_NAMES)
            .insert({ name: productName.trim() })
            .returning("id");
          nameId = insertedP.id || insertedP;
        }

        let stockId = null;
        if (accountUsername) {
          let stock = await trx(TABLES.PRODUCT_KEYS)
            .whereRaw("LOWER(account_username) = ?", [accountUsername])
            .first();

          stockId = stock?.id;
          if (!stockId && (isSaveToWarehouse || isSaveToPackage)) {
            const [newStock] = await trx(TABLES.PRODUCT_KEYS)
              .insert({
                account_username: accountUsername,
                created_at: new Date(),
              })
              .returning("*");
            stockId = newStock.id;
          }
        }

        if (stockId && nameId && isSaveToWarehouse) {
          const existingService = await trx(TABLES.STOCK_SERVICES)
            .where({
              account_id: stockId,
              name_id: nameId,
            })
            .first();

          if (existingService) {
            // Đã có trong kho -> Luôn đồng bộ dữ liệu mới (kể cả khi không lưu kho)
            await trx(TABLES.STOCK_SERVICES)
              .where({ id: existingService.id })
              .update({
                password_encrypted: payload.slot || existingService.password_encrypted,
                expires_at: payload.expired_at ? new Date(payload.expired_at) : existingService.expires_at,
                status: "AVAILABLE",
                note: payload.note || existingService.note,
                updated_at: new Date(),
              });
            console.log(`✅ [WarehouseSync] Đã đồng bộ dữ liệu mới cho tài khoản "${accountUsername}" từ đơn ${id_order}`);
          } else {
            // Chưa có trong kho nhưng bật lưu kho -> tạo mới
            await trx(TABLES.STOCK_SERVICES).insert({
              account_id: stockId,
              name_id: nameId,
              password_encrypted: payload.slot || null,
              backup_email: "",
              two_fa_encrypted: null,
              expires_at: payload.expired_at ? new Date(payload.expired_at) : null,
              status: "AVAILABLE",
              note: payload.note || null,
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        }

        if (stockId) {
          emitOrderEvent(trx, EVENTS.WAREHOUSE_STOCK_CREATED, {
            id: stockId,
            account: accountUsername,
            source: "order_sync",
            orderId: createdOrder.id,
            orderCode: createdOrder.id_order,
          });
        }

        // 4. Check & Sync Package Product (warehouse.package_products)
        if (isSaveToPackage && stockId && nameId) {
          const existingPackage = await trx(TABLES.PACKAGE_PRODUCT)
            .where({
              product_name_id: nameId,
              account_id: stockId,
            })
            .first();

          if (!existingPackage) {
            let storageAccountId = null;
            if (payload.storage_account_username && String(payload.storage_account_username).trim()) {
              const storageAccUser = String(payload.storage_account_username).trim().toLowerCase();
              let storageStock = await trx(TABLES.PRODUCT_KEYS)
                .whereRaw("LOWER(account_username) = ?", [storageAccUser])
                .first();
              if (storageStock) {
                storageAccountId = storageStock.id;
              } else {
                const [newStorageStock] = await trx(TABLES.PRODUCT_KEYS)
                  .insert({
                    account_username: storageAccUser,
                    created_at: new Date(),
                  })
                  .returning("*");
                storageAccountId = newStorageStock.id;
              }
            }

            let supplierName = payload.supply_id || "Mavryk";
            if (typeof supplierName === "number" || !isNaN(Number(supplierName))) {
              const sup = await trx(TABLES.SUPPLIER).where("id", Number(supplierName)).first();
              if (sup) supplierName = sup.supplier_name || sup.ncc_name || supplierName;
            }

            await trx(TABLES.PACKAGE_PRODUCT).insert({
              product_name_id: nameId,
              account_id: stockId,
              supplier: supplierName,
              cost: Number(payload.cost || 0),
              slot: Number(payload.package_slots || 2),
              match_rule: payload.package_match_rule || "information",
              package_note: payload.note || null,
              storage_account_id: storageAccountId,
              storage_total: payload.storage_total || null,
              created_at: new Date(),
              updated_at: new Date(),
            });
            console.log(`📦 [PackageSync] Đã tự động tạo mới Gói sản phẩm cho tài khoản "${accountUsername}" - dịch vụ ID ${nameId}`);
          } else {
            console.log(`📦 [PackageSync] Gói sản phẩm cho tài khoản "${accountUsername}" đã tồn tại, bỏ qua.`);
          }
        }
      } catch (err) {
        console.error("[OrderService] Lỗi tự động lưu/đồng bộ kho/gói:", err);
      }
    }


    // 5. Tự động ghi nhận log chi phí NCC cho đơn nhập hàng (MAVN)
    const importCost = Number(createdOrder.cost || 0);
    if (isMavn && importCost > 0) {
      let supplyId = createdOrder.supply_id ? Number(createdOrder.supply_id) : null;
      if (!supplyId) {
        const defaultSupplier = await trx(TABLES.SUPPLIER).orderBy("id", "asc").first();
        supplyId = defaultSupplier ? defaultSupplier.id : 1;
      }

      let isSupplierMavryk = false;
      if (supplyId) {
        const sup = await trx(TABLES.SUPPLIER).where({ id: supplyId }).first();
        if (sup && String(sup.supplier_name || "").trim().toLowerCase() === "mavryk") {
          isSupplierMavryk = true;
        }
      }

      if (!isSupplierMavryk) {
        const existingLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
          .where({ order_list_id: createdOrder.id })
          .first();

        if (!existingLog) {
          await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
            order_list_id: createdOrder.id,
            supply_id: supplyId,
            id_order: createdOrder.id_order,
            import_cost: importCost,
            ncc_payment_status: 'Chưa Thanh Toán',
            logged_at: db.fn.now(),
          });

          emitOrderEvent(trx, EVENTS.SUPPLIER_COST_ADDED, {
            cost: importCost,
            supplier_id: supplyId,
            order_id: createdOrder.id,
            id_order: createdOrder.id_order,
            summary: `Thêm chi phí nhập hàng cho đơn #${createdOrder.id_order}: ${importCost} ₫`,
          });
        }
      }
    }

    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const statusLabel = getOrderStatusLabel(createdOrder.status);
    const summary = `Tạo mới đơn hàng #${createdOrder.id_order} cho khách "${createdOrder.customer}" với tổng tiền ${formatMoney(createdOrder.price)} [Trạng thái: ${statusLabel}]`;

    // Phát event Domain: ORDER_CREATED
    emitOrderEvent(trx, EVENTS.ORDER_CREATED, {
      ...createdOrder,
      orderId: createdOrder.id,
      summary,
      action: "CREATE",
    });

    if (isMavn && Number(createdOrder.cost) > 0) {
      emitOrderEvent(trx, EVENTS.ORDER_IMPORT_CREATED, {
        orderId: createdOrder.id,
        id_order: createdOrder.id_order,
        orderCode: createdOrder.id_order,
        cost: Number(createdOrder.cost),
        order_date: createdOrder.order_date,
        created_at: createdOrder.created_at,
        customer: createdOrder.customer,
      });
    }

    return await attachVietQrToOrder(createdOrder, trx);
  });
}

/**
 * Cập nhật đơn hàng + phát event ORDER_UPDATED với chi tiết diff (Bọc Transaction)
 */
async function updateOrder(id, payload) {
  return await withTransaction(async (trx) => {
    const existingOrder = await getOrderTable(trx).where({ id: Number(id) }).first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng cần sửa.");
    }

    const targetCustomer = payload.customer !== undefined ? payload.customer : existingOrder.customer;
    const isMavryk = isCustomerMavryk(targetCustomer);

    const updateFields = {};
    if (payload.customer !== undefined) updateFields.customer = payload.customer;
    if (payload.contact !== undefined) updateFields.contact = payload.contact;
    if (payload.information_order !== undefined) updateFields.information_order = payload.information_order;
    if (payload.slot !== undefined) updateFields.slot = payload.slot;
    if (payload.id_product !== undefined) {
      const numProdId = Number(payload.id_product);
      if (!isNaN(numProdId) && numProdId > 0) {
        updateFields.id_product = numProdId;
      } else if (payload.id_product) {
        const matched = await trx(TABLES.VARIANT)
          .whereILike("display_name", String(payload.id_product))
          .orWhereILike("variant_name", String(payload.id_product))
          .first();
        updateFields.id_product = matched ? matched.id : null;
      } else {
        updateFields.id_product = null;
      }
    }
    const isMavn = Boolean(
      (existingOrder.id_order && String(existingOrder.id_order).startsWith("MAVN")) ||
      (targetCustomer && isCustomerMavryk(targetCustomer))
    );

    if (isMavn) {
      if (payload.cost !== undefined) {
        updateFields.cost = Number(payload.cost);
      } else if (payload.price !== undefined && (!existingOrder.cost || Number(existingOrder.cost) === 0)) {
        updateFields.cost = Number(payload.price);
      }
      updateFields.price = 0;
      updateFields.gross_selling_price = 0;
    } else {
      if (payload.price !== undefined) updateFields.price = Number(payload.price);
      if (payload.gross_selling_price !== undefined) updateFields.gross_selling_price = Number(payload.gross_selling_price);
      if (payload.cost !== undefined) updateFields.cost = Number(payload.cost);
    }

    if (payload.status !== undefined) {
      const status = payload.status;
      updateFields.status = status;
      if (status === ORDER_STATUS.PAID) {
        updateFields.was_paid = true;
      }

      if (status === ORDER_STATUS.UNPAID || status === ORDER_STATUS.RENEW_REQUIRED) {
        const basePrice = payload.price != null ? Number(payload.price) : Number(existingOrder.price || 0);
        if (basePrice > 0) {
          const suffix = await getAvailableSuffix();
          const finalPrice = applySuffixToPrice(basePrice, suffix);
          updateFields.price = finalPrice;
          updateFields.gross_selling_price = finalPrice;
        }
      }
    }

    if (payload.payment_method !== undefined) updateFields.payment_method = payload.payment_method;
    if (payload.note !== undefined) updateFields.note = payload.note;
    if (payload.days !== undefined) updateFields.days = Number(payload.days);
    if (payload.order_date !== undefined) updateFields.order_date = payload.order_date || null;
    if (payload.expired_at !== undefined) updateFields.expired_at = payload.expired_at || null;
    if (payload.supply_id !== undefined) {
      updateFields.supply_id = await resolveSupplyId(trx, payload.supply_id);
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: Number(id) })
      .update(updateFields)
      .returning("*");

    // Tính toán diff chi tiết (trường nào bị sửa, từ giá trị cũ sang mới)
    const changes = {};
    const changedFields = [];
    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const summaryParts = [];

    const labels = {
      customer: "Khách hàng",
      contact: "Liên hệ",
      information_order: "Sản phẩm / Thông tin gói",
      slot: "Slot / Tài khoản",
      id_product: "Mã sản phẩm",
      price: "Giá bán",
      gross_selling_price: "Giá bán gộp",
      cost: "Giá nhập",
      status: "Trạng thái",
      payment_method: "Phương thức thanh toán",
      note: "Ghi chú",
      days: "Thời hạn (ngày)",
      order_date: "Ngày đặt hàng",
      expired_at: "Ngày hết hạn",
      supply_id: "Nhà cung cấp",
    };

    const isMoneyField = (f) => ["price", "gross_selling_price", "cost"].includes(f);

    for (const [key, newVal] of Object.entries(updateFields)) {
      const oldVal = existingOrder[key];
      const oldCompare = oldVal == null ? "" : String(oldVal).trim();
      const newCompare = newVal == null ? "" : String(newVal).trim();

      if (oldCompare !== newCompare) {
        changedFields.push(key);
        changes[key] = { old: oldVal, new: newVal };
        const label = labels[key] || key;

        if (isMoneyField(key)) {
          summaryParts.push(`${label}: ${formatMoney(Number(oldVal || 0))} ➔ ${formatMoney(Number(newVal || 0))}`);
        } else if (key === "status") {
          summaryParts.push(`${label}: "${getOrderStatusLabel(oldVal)}" ➔ "${getOrderStatusLabel(newVal)}"`);
        } else {
          summaryParts.push(`${label}: "${oldVal ?? ""}" ➔ "${newVal ?? ""}"`);
        }
      }
    }

    const updatePayload = {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      previousStatus: existingOrder.status,
      newStatus: updatedOrder.status,
      changed_fields: changedFields,
      changes,
      old_values: existingOrder,
      new_values: updatedOrder,
      summary: summaryParts.length > 0 ? summaryParts.join("; ") : `Cập nhật đơn hàng #${updatedOrder.id_order}`,
      action: "UPDATE",
    };

    // Phát event Domain: ORDER_UPDATED
    emitOrderEvent(trx, EVENTS.ORDER_UPDATED, updatePayload);

    if (isMavn && updateFields.status === ORDER_STATUS.CANCELED && existingOrder.status !== ORDER_STATUS.CANCELED) {
      await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
        .where({ order_list_id: existingOrder.id })
        .update({ ncc_payment_status: 'Đã Hủy' });

      const remainingAmount = calculateOrderRemainingValue(existingOrder);
      if (remainingAmount > 0) {
        emitOrderEvent(trx, EVENTS.ORDER_IMPORT_CANCELED, {
          orderId: existingOrder.id,
          id_order: existingOrder.id_order,
          orderCode: existingOrder.id_order,
          remainingAmount,
          cost: Number(existingOrder.cost || existingOrder.price || 0),
          customer: existingOrder.customer,
        });
      }
    }

    return await attachVietQrToOrder(updatedOrder, trx);
  });
}

/**
 * Gia hạn đơn hàng: Chuyển trạng thái sang ORDER_STATUS.RENEW_REQUIRED, cấp phát Slot Suffix và tính lại tổng tiền
 */
async function renewOrder(id, payload = {}) {
  return await withTransaction(async (trx) => {
    const existingOrder = await getOrderTable(trx).where({ id: Number(id) }).forUpdate().first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng cần gia hạn.");
    }

    const isMavn = Boolean(
      (existingOrder.id_order && String(existingOrder.id_order).toUpperCase().startsWith("MAVN")) ||
      (existingOrder.customer && isCustomerMavryk(existingOrder.customer))
    );

    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const daysToAdd = payload.days ? Number(payload.days) : Number(existingOrder.days || 365);

    // ─────────────────────────────────────────────────────────────
    // 1. XỬ LÝ RIÊNG CHO ĐƠN NHẬP HÀNG (MAVN... / Mavryk)
    // ─────────────────────────────────────────────────────────────
    if (isMavn) {
      const newExpiredAt = calculateNewExpiry(existingOrder.expired_at, daysToAdd);
      const renewCost = payload.cost != null ? Number(payload.cost) : Number(existingOrder.cost || 0);

      const updateFields = {
        status: ORDER_STATUS.PAID,
        was_paid: true,
        expired_at: newExpiredAt,
        days: daysToAdd,
      };

      if (payload.cost !== undefined) updateFields.cost = renewCost;
      if (payload.note !== undefined) updateFields.note = payload.note;
      if (payload.supply_id !== undefined) {
        updateFields.supply_id = payload.supply_id ? Number(payload.supply_id) : existingOrder.supply_id;
      }

      const [updatedOrder] = await getOrderTable(trx)
        .where({ id: Number(id) })
        .update(updateFields)
        .returning("*");

      // A. Trừ lợi nhuận: Phát event ORDER_IMPORT_CREATED để tăng total_shop_cost và trừ lợi nhuận
      if (renewCost > 0) {
        emitOrderEvent(trx, EVENTS.ORDER_IMPORT_CREATED, {
          orderId: updatedOrder.id,
          id_order: updatedOrder.id_order,
          orderCode: updatedOrder.id_order,
          cost: renewCost,
          order_date: trx.fn.now(),
          created_at: trx.fn.now(),
          customer: updatedOrder.customer,
          action: "RENEW_IMPORT",
          summary: `Gia hạn đơn nhập hàng #${updatedOrder.id_order}: ${formatMoney(renewCost)}`,
        });
      }

      // B. Quản lý công nợ NCC: Đối với Mavryk (chủ shop) thì KHÔNG TẠO LOG trong NCC
      const supplyId = updatedOrder.supply_id ? Number(updatedOrder.supply_id) : null;
      let isSupplierMavryk = false;
      if (supplyId) {
        const sup = await trx(TABLES.SUPPLIER).where({ id: supplyId }).first();
        if (sup && String(sup.supplier_name || "").trim().toLowerCase() === "mavryk") {
          isSupplierMavryk = true;
        }
      }

      if (!isSupplierMavryk && supplyId && renewCost > 0) {
        await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
          order_list_id: updatedOrder.id,
          supply_id: supplyId,
          id_order: updatedOrder.id_order,
          import_cost: renewCost,
          ncc_payment_status: "Chưa Thanh Toán",
          logged_at: trx.fn.now(),
        });

        emitOrderEvent(trx, EVENTS.SUPPLIER_COST_ADDED, {
          cost: renewCost,
          supplier_id: supplyId,
          order_id: updatedOrder.id,
          id_order: updatedOrder.id_order,
          summary: `Thêm chi phí gia hạn nhập hàng cho đơn #${updatedOrder.id_order}: ${formatMoney(renewCost)}`,
        });
      }

      // C. Phát event cập nhật và gia hạn
      emitOrderEvent(trx, EVENTS.ORDER_PAID, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        amount: 0,
        cost: renewCost,
        status: updatedOrder.status,
        isRenewal: true,
        action: "RENEW_IMPORT",
      });

      emitOrderEvent(trx, EVENTS.ORDER_RENEWED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        daysAdded: daysToAdd,
        newExpiredAt: updatedOrder.expired_at,
        action: "RENEW_IMPORT",
      });

      emitOrderEvent(trx, EVENTS.ORDER_UPDATED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        previousStatus: existingOrder.status,
        newStatus: updatedOrder.status,
        price: updatedOrder.price,
        cost: updatedOrder.cost,
        days: updatedOrder.days,
        summary: `Gia hạn thành công đơn nhập hàng #${updatedOrder.id_order} (Đã Thanh Toán, gia hạn đến ${newExpiredAt})`,
        action: "RENEW_IMPORT",
      });

      return updatedOrder;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. XỬ LÝ CHO ĐƠN BÁN CỦA KHÁCH HÀNG (GIỮ NGUYÊN NHƯ CŨ)
    // ─────────────────────────────────────────────────────────────
    const rawBasePrice = payload.price != null ? Number(payload.price) : Number(existingOrder.price || 0);
    const basePrice = Math.floor(rawBasePrice / 1000) * 1000 || rawBasePrice;

    // Cấp phát Slot Suffix (1..100) khả dụng không bị trùng cho số tiền này
    const suffix = await getAvailableSuffix();
    const finalPrice = applySuffixToPrice(basePrice, suffix);

    const days = daysToAdd;

    const updateFields = {
      status: ORDER_STATUS.RENEW_REQUIRED,
      price: finalPrice,
      gross_selling_price: finalPrice,
      days,
    };

    if (payload.note !== undefined) updateFields.note = payload.note;
    if (payload.supply_id !== undefined) updateFields.supply_id = payload.supply_id ? Number(payload.supply_id) : null;

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: Number(id) })
      .update(updateFields)
      .returning("*");

    const summary = `Yêu cầu gia hạn đơn hàng #${updatedOrder.id_order} thành công. Trạng thái: "${getOrderStatusLabel(ORDER_STATUS.RENEW_REQUIRED)}", Tổng tiền thanh toán: ${formatMoney(updatedOrder.price)} (Slot Suffix: ${suffix})`;

    // Phát event Domain: ORDER_UPDATED với action RENEWAL_REQUESTED
    emitOrderEvent(trx, EVENTS.ORDER_UPDATED, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      previousStatus: existingOrder.status,
      newStatus: updatedOrder.status,
      price: updatedOrder.price,
      days: updatedOrder.days,
      summary,
      action: "RENEWAL_REQUESTED",
    });

    return updatedOrder;
  });
}

/**
 * Xóa đơn hàng (Hard Delete) hoặc Hủy & Chuyển Trạng Thái (Soft Delete) + phát event
 */
async function deleteOrder(id) {
  return await withTransaction(async (trx) => {
    const existingOrder = await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).forUpdate().first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng cần xóa.");
    }

    const status = existingOrder.status;
    if (status === ORDER_STATUS.CANCELED) {
      throw new Error("Đơn hàng đã hủy không thể bị xóa vĩnh viễn.");
    }
    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const todayYMD = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];

    const isMavn = Boolean(
      (existingOrder.id_order && String(existingOrder.id_order).startsWith("MAVN")) ||
      (existingOrder.customer && isCustomerMavryk(existingOrder.customer))
    );

    // Xử lý riêng cho Đơn Nhập Hàng (MAVN... / Mavryk)
    if (isMavn) {
      const remainingAmount = calculateOrderRemainingValue(existingOrder);
      await trx(TABLES.SUPPLIER_ORDER_COST_LOG).where({ order_list_id: Number(id) }).del();
      await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).del();

      const summary = `Đã xóa đơn nhập hàng #${existingOrder.id_order} (${formatMoney(existingOrder.cost || existingOrder.price || 0)}), hoàn trả lợi nhuận: ${formatMoney(remainingAmount)}`;

      emitOrderEvent(trx, EVENTS.ORDER_DELETED, {
        orderId: existingOrder.id,
        id_order: existingOrder.id_order,
        customer: existingOrder.customer,
        price: 0,
        cost: existingOrder.cost,
        deletedOrder: existingOrder,
        summary,
        action: "HARD_DELETE_IMPORT",
      });

      if (remainingAmount > 0) {
        emitOrderEvent(trx, EVENTS.ORDER_IMPORT_CANCELED, {
          orderId: existingOrder.id,
          id_order: existingOrder.id_order,
          orderCode: existingOrder.id_order,
          remainingAmount,
          cost: Number(existingOrder.cost || existingOrder.price || 0),
          customer: existingOrder.customer,
        });
      }

      return { success: true, action: "deleted", message: summary };
    }

    const isPaidOrder = status === ORDER_STATUS.PAID;

    if (!isPaidOrder) {
      await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).del();
      const summary = `Đã xóa vĩnh viễn đơn hàng #${existingOrder.id_order} của khách "${existingOrder.customer}" (${formatMoney(existingOrder.price)})`;
      emitOrderEvent(trx, EVENTS.ORDER_DELETED, {
        orderId: existingOrder.id,
        id_order: existingOrder.id_order,
        customer: existingOrder.customer,
        price: existingOrder.price,
        deletedOrder: existingOrder,
        summary,
        action: "HARD_DELETE",
      });
      return { success: true, action: "deleted", message: `Đã xóa vĩnh viễn đơn hàng #${existingOrder.id_order}` };
    }

    // Đơn Đã Thanh Toán khi xóa -> Chuyển thành Đã Hủy (CANCELED) để nằm trong tab Hoàn Tiền
    await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).update({
      status: ORDER_STATUS.CANCELED,
      canceled_at: existingOrder.canceled_at || todayYMD,
    });

    const refundAmount = calculateOrderRemainingValue(existingOrder, Number(existingOrder.price || 0));
    await createRefundCreditNoteForCanceledOrder(trx, existingOrder, refundAmount, todayYMD);

    const summary = `Đã hủy đơn hàng đã thanh toán #${existingOrder.id_order} của khách "${existingOrder.customer}" (${formatMoney(existingOrder.price)}), hoàn credit theo ngày còn lại: ${formatMoney(refundAmount)}`;

    emitOrderEvent(trx, EVENTS.ORDER_CANCELED_REFUNDED, {
      orderId: existingOrder.id,
      orderCode: existingOrder.id_order,
      order: existingOrder,
      refundAmount,
      canceledAt: todayYMD,
      summary,
      action: "ORDER_CANCELED",
    });

    return { success: true, action: "canceled", message: summary };
  });
}

async function processOrderToProcessing(id) {
  return await withTransaction(async (trx) => {
    const existingOrder = await getOrderTable(trx).where({ id: Number(id) }).first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng.");
    }

    const isRenewal = isRenewalOrder(existingOrder.status);
    const daysToAdd = Number(existingOrder.days || 365);

    const updateFields = {
      status: ORDER_STATUS.PROCESSING,
    };

    let newExpiredAt = null;
    if (isRenewal) {
      newExpiredAt = calculateNewExpiry(existingOrder.expired_at, daysToAdd);
      updateFields.expired_at = newExpiredAt;
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: Number(id) })
      .update(updateFields)
      .returning("*");

    const existingLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ order_list_id: updatedOrder.id })
      .first();

    const importCost = Number(updatedOrder.cost || 0);
    if (!existingLog && importCost > 0) {
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

      emitOrderEvent(trx, EVENTS.SUPPLIER_COST_ADDED, {
        cost: importCost,
        supplier_id: updatedOrder.supply_id,
        summary: `Thêm chi phí nhập hàng cho đơn #${updatedOrder.id_order}: ${importCost} ₫`,
      });
    }

    const summary = `Đơn hàng #${updatedOrder.id_order} đã chuyển sang Đang Xử Lý. Đã ghi nhận chi phí nhập hàng.`;
    emitOrderEvent(trx, EVENTS.ORDER_UPDATED, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      previousStatus: existingOrder.status,
      newStatus: updatedOrder.status,
      summary,
      action: "SET_PROCESSING",
    });

    return updatedOrder;
  });
}

async function processCompleteOrder(trxContext, order, amount, options = {}) {
  const runWithTrx = async (trx) => {
    const isRenewal = isRenewalOrder(order.status);
    const daysToAdd = Number(order.days || 365);

    const updateFields = {
      status: ORDER_STATUS.PAID,
      was_paid: true,
    };

    let newExpiredAt = null;
    if (isRenewal) {
      newExpiredAt = calculateNewExpiry(order.expired_at, daysToAdd);
      updateFields.expired_at = newExpiredAt;
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: order.id })
      .update(updateFields)
      .returning("*");

    const payAmount = amount != null ? Number(amount) : Number(updatedOrder.price || 0);

    emitOrderEvent(trx, EVENTS.ORDER_PAID, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      amount: payAmount,
      price: Number(updatedOrder.price || 0),
      cost: Number(updatedOrder.cost || 0),
      order_date: updatedOrder.order_date,
      status: updatedOrder.status,
      isRenewal,
      action: options.action || "COMPLETED",
    });

    if (isRenewal) {
      emitOrderEvent(trx, EVENTS.ORDER_RENEWED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        daysAdded: daysToAdd,
        newExpiredAt: updatedOrder.expired_at,
        action: options.action || "COMPLETED",
      });
    }

    return { updatedOrder, isRenewal };
  };

  if (trxContext) {
    return await runWithTrx(trxContext);
  } else {
    return await withTransaction(async (trx) => {
      return await runWithTrx(trx);
    });
  }
}

async function payOrderWithCredit(id, creditNoteId) {
  return await withTransaction(async (trx) => {
    const order = await getOrderTable(trx).where({ id: Number(id) }).forUpdate().first();
    if (!order) throw new Error("Không tìm thấy đơn hàng.");

    const creditNote = await trx(TABLES.REFUND_CREDIT_NOTES).where({ id: Number(creditNoteId) }).forUpdate().first();
    if (!creditNote) throw new Error("Không tìm thấy mã credit.");

    const orderPrice = Number(order.price || 0);
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

    if (availableAmount < orderPrice) {
      throw new Error(`Số dư credit (${availableAmount.toLocaleString()} ₫) không đủ thanh toán đơn hàng (${orderPrice.toLocaleString()} ₫).`);
    }

    await trx(TABLES.REFUND_CREDIT_APPLICATIONS).insert({
      credit_note_id: creditNote.id,
      target_order_list_id: order.id,
      target_order_code: order.id_order,
      applied_amount: orderPrice,
      note: `Thanh toán đơn #${order.id_order} bằng credit ${creditNote.credit_code}`,
      applied_by: 'ADMIN',
    });

    const newAvailable = availableAmount - orderPrice;
    const newStatus = newAvailable <= 0 ? 'FULLY_APPLIED' : 'PARTIALLY_APPLIED';
    await trx(TABLES.REFUND_CREDIT_NOTES)
      .where({ id: creditNote.id })
      .update({
        available_amount: newAvailable,
        status: newStatus,
        updated_at: db.fn.now(),
      });

    const isRenewal = isRenewalOrder(order.status);
    const daysToAdd = Number(order.days || 365);
    const updateFields = {
      status: ORDER_STATUS.PROCESSING,
      payment_method: 'credit',
    };

    if (isRenewal) {
      updateFields.expired_at = calculateNewExpiry(order.expired_at, daysToAdd);
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: order.id })
      .update(updateFields)
      .returning("*");

    const existingLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ order_list_id: updatedOrder.id })
      .first();
    const importCost = Number(updatedOrder.cost || 0);
    if (!existingLog && importCost > 0) {
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

      emitOrderEvent(trx, EVENTS.SUPPLIER_COST_ADDED, {
        cost: importCost,
        supplier_id: updatedOrder.supply_id,
        summary: `Thêm chi phí nhập hàng cho đơn #${updatedOrder.id_order} thanh toán bằng credit: ${importCost} ₫`,
      });
    }

    return updatedOrder;
  });
}

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  renewOrder,
  deleteOrder,
  processOrderToProcessing,
  processCompleteOrder,
  payOrderWithCredit,
  calculateOrderRemainingValue,
};
