const { db, TABLES, COLS, withTransaction } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { getAvailableSuffix, applySuffixToPrice, extractSlotSuffix } = require("@/domains/payments/services/slotSuffixService");
const { ORDER_STATUS, getOrderStatusLabel } = require("@/constants/orderStatus");
const { SUPPLIER_PAYMENT_STATUS } = require("@/constants/supplierStatus");
const { isRenewalOrder, calculateNewExpiry } = require("./orderPaymentService");
const { isMavrykSupplier } = require("@/domains/suppliers/utils/supplierCheck");
const { resolveOrderCatalogPricing, getOrderPrefix, selectCatalogPrice } = require("@/domains/products/services/catalogPricingService");

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
  let defaultBank = await queryDb(TABLES.SHOP_BANK_ACCOUNTS)
    .where({ account_type: "bank", is_deleted: false, is_default: true, is_active: true })
    .first();
  if (!defaultBank) {
    defaultBank = await queryDb(TABLES.SHOP_BANK_ACCOUNTS)
      .where({ account_type: "bank", is_deleted: false, is_active: true })
      .first();
  }
  if (!defaultBank) {
    defaultBank = await queryDb(TABLES.SHOP_BANK_ACCOUNTS)
      .where({ account_type: "bank", is_deleted: false })
      .first();
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
async function getOrders({ page = 1, limit = 20, search = "", status = "", tab = "", includeStats = true } = {}) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (page - 1) * limit;
  const shouldIncludeStats = includeStats !== false;

  // 1. Tính toán tabCounts song song trên toàn bộ cơ sở dữ liệu (Tối ưu Promise.all)
  let tabCounts;
  if (shouldIncludeStats) {
      const [[canceledRes], [expiredRes], [importRes], [activeRes]] = await Promise.all([

        getOrderTable().where(applyCanceledFilter).count("id as count"),

        getOrderTable().where(applyExpiredFilter).count("id as count"),

        getOrderTable().where(applyImportFilter).count("id as count"),

        getOrderTable().where(applyActiveFilter).count("id as count"),

      ]);



      tabCounts = {

        active: Number(activeRes?.count || 0),

        import: Number(importRes?.count || 0),

        expired: Number(expiredRes?.count || 0),

        canceled: Number(canceledRes?.count || 0),

      };



      // 2. Truy vấn danh sách đơn thuộc tab hiện tại
  }

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

  const trimmedSearch = String(search || "").trim();
  if (trimmedSearch) {
    query = query.where((builder) => {
      builder
        .whereILike(O_COLS.ID_ORDER, `%${trimmedSearch}%`)
        .orWhereILike(O_COLS.CUSTOMER, `%${trimmedSearch}%`)
        .orWhereILike(O_COLS.CONTACT, `%${trimmedSearch}%`)
        .orWhereILike(O_COLS.INFORMATION_ORDER, `%${trimmedSearch}%`)
        .orWhereILike(O_COLS.SLOT, `%${trimmedSearch}%`)
        .orWhereILike(O_COLS.NOTE, `%${trimmedSearch}%`)
        .orWhereILike(O_COLS.ID_PRODUCT, `%${trimmedSearch}%`)
        .orWhereIn(O_COLS.ID_PRODUCT, function () {
          this.select(db.raw(`CAST(${TABLES.VARIANT}.${COLS.VARIANT.ID} AS VARCHAR)`))
            .from(TABLES.VARIANT)
            .leftJoin(TABLES.PRODUCT, `${TABLES.PRODUCT}.${COLS.PRODUCT.ID}`, `${TABLES.VARIANT}.${COLS.VARIANT.PRODUCT_ID}`)
            .whereILike(`${TABLES.VARIANT}.${COLS.VARIANT.DISPLAY_NAME}`, `%${trimmedSearch}%`)
            .orWhereILike(`${TABLES.VARIANT}.${COLS.VARIANT.VARIANT_NAME}`, `%${trimmedSearch}%`)
            .orWhereILike(`${TABLES.PRODUCT}.${COLS.PRODUCT.PACKAGE_NAME}`, `%${trimmedSearch}%`);
        })
        .orWhereIn(O_COLS.SUPPLY_ID, function () {
          this.select(COLS.SUPPLIER.ID)
            .from(TABLES.SUPPLIER)
            .whereILike(COLS.SUPPLIER.SUPPLIER_NAME, `%${trimmedSearch}%`);
        })
        .orWhereIn(O_COLS.ID, function () {
          this.select(COLS.SUPPLIER_ORDER_COST_LOG.ORDER_LIST_ID)
            .from(TABLES.SUPPLIER_ORDER_COST_LOG)
            .whereIn(COLS.SUPPLIER_ORDER_COST_LOG.SUPPLY_ID, function () {
              this.select(COLS.SUPPLIER.ID)
                .from(TABLES.SUPPLIER)
                .whereILike(COLS.SUPPLIER.SUPPLIER_NAME, `%${trimmedSearch}%`);
            });
        });
    });
  }

  const [countResult] = await query.clone().count("id as total");
  const total = Number(countResult?.total || 0);

  // 3. SQL Aggregation trực tiếp trong PostgreSQL (Tối ưu tốc độ, không kéo all rows về Node RAM)
  const todayStr = new Date().toISOString().split("T")[0];

  let summary;
  if (shouldIncludeStats) {
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

            WHERE status = '${ORDER_STATUS.PROCESSING}'

          ) as "processingCount",

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



      summary = {

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
  }

  const ordersQuery = query.select("*");
  if (tab === "expired") {
    ordersQuery.orderByRaw("expired_at DESC NULLS LAST, id DESC");
  } else {
    ordersQuery.orderByRaw(`
      CASE
        WHEN status = '${ORDER_STATUS.UNPAID}' THEN 1
        WHEN status = '${ORDER_STATUS.PROCESSING}' THEN 2
        WHEN status = '${ORDER_STATUS.RENEW_REQUIRED}' THEN 3
        WHEN status = '${ORDER_STATUS.PAID}' THEN 4
        ELSE 5
      END ASC,
      expired_at ASC NULLS LAST,
      id DESC
    `);
  }
  const orders = await ordersQuery.limit(limit).offset(offset);
  const enrichedOrders = await attachBatchSupplierAndQrInfo(orders);

  return {
    data: enrichedOrders,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
    ...(tabCounts ? { tabCounts } : {}),
    ...(summary ? { summary } : {}),
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
      .select("id", "variant_name", "display_name", "product_id", "is_active", "base_price");
    for (const v of variants) {
      variantMap.set(Number(v.id), v);
    }
  }

  // 3d. Truy vấn nạp danh sách giá tier (variant_price) trong 1 query duy nhất để đối chiếu giá Catalog
  const variantPricesMap = new Map();
  if (neededVariantIds.size > 0) {
    const prices = await queryDb(TABLES.VARIANT_PRICE)
      .whereIn("variant_id", Array.from(neededVariantIds))
      .select("variant_id", "tier_id", "price");
    for (const p of prices) {
      const vId = Number(p.variant_id);
      if (!variantPricesMap.has(vId)) variantPricesMap.set(vId, []);
      variantPricesMap.get(vId).push(p);
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
        bankBin: defaultBank.bank_bin || defaultBank.bankBin || bin,
        accNum,
        accName,
        bankName: defaultBank.bank_display_name || defaultBank.bankShortCode || bin,
      };
    }
  }

  // 4b. Nạp số tiền đã khớp thanh toán qua webhook/biên lai từ payment_receipt_allocations trong 1 batch query
  const orderCodes = orders.map((o) => o.id_order).filter(Boolean);
  const webhookAmountMap = new Map();
  if (orderCodes.length > 0) {
    try {
      const allocations = await queryDb(TABLES.PAYMENT_RECEIPT_ALLOCATIONS)
        .whereIn("target_code", orderCodes)
        .groupBy("target_code")
        .select("target_code", queryDb.raw("COALESCE(SUM(amount), 0)::numeric as total_allocated"));
      for (const a of allocations) {
        webhookAmountMap.set(a.target_code, Number(a.total_allocated || 0));
      }
    } catch (allocErr) {
      console.warn("[attachBatchSupplierAndQrInfo] Không thể nạp allocations:", allocErr.message);
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

    // ĐỐI CHIẾU GIÁ CATALOG ĐỘNG CHO ĐƠN CẦN GIA HẠN (Chỉ đạo tối cao của Master)
    const statusUpper = String(order.status || "").trim().toUpperCase();
    const isRenewRequired = statusUpper === ORDER_STATUS.RENEW_REQUIRED || statusUpper === "CẦN GIA HẠN";

    let effectivePrice = Number(order.price || 0);
    let effectiveGrossPrice = order.gross_selling_price != null ? Number(order.gross_selling_price) : null;
    let isVariantActive = true;

    if (isRenewRequired && matchedVariant) {
      isVariantActive = matchedVariant.is_active !== false;
      const prices = variantPricesMap.get(vId) || [];
      const prefix = getOrderPrefix(order.id_order);
      const catalogBasePrice = selectCatalogPrice(prefix, matchedVariant, prices);
      if (catalogBasePrice > 0) {
        const suffix = extractSlotSuffix(order) || 0;
        effectiveGrossPrice = catalogBasePrice;
        effectivePrice = applySuffixToPrice(catalogBasePrice, suffix);
      }
    }

    const isPaid = statusUpper === ORDER_STATUS.PAID || statusUpper === "ĐÃ THANH TOÁN" || Boolean(order.was_paid);
    const allocatedAmount = webhookAmountMap.get(order.id_order);
    const webhookAmount = allocatedAmount != null ? allocatedAmount : (isPaid ? Number(effectivePrice || order.price || 0) : 0);

    const enriched = {
      ...order,
      supply_id: resolvedSupplyId,
      supplier_name: supplierName,
      variant_name: variantName,
      display_name: displayName,
      price: effectivePrice,
      gross_selling_price: effectiveGrossPrice,
      is_variant_inactive: isRenewRequired && !isVariantActive,
      webhook_amount: webhookAmount,
    };

    const isImport = String(order.id_order || "").toUpperCase().startsWith("MAVN") ||
      (Number(order.cost || 0) > 0 && String(order.status || "").toLowerCase().includes("nhập hàng"));

    if (isRenewRequired && !isVariantActive) {
      // Đơn hàng có sản phẩm đang không hoạt động: Lược bỏ QR và thông tin thanh toán theo chỉ đạo của Master
      enriched.vietqr_url = null;
    } else if (isImport && supplier && (supplier.number_bank || supplier.numberBank)) {
      const bin = supplier.bin_bank || supplier.binBank || "970422";
      const accNum = supplier.number_bank || supplier.numberBank;
      const accName = supplier.account_holder || supplier.accountHolder || supplier.supplier_name || "";
      const amount = Math.round(Number(order.cost || effectivePrice || 0));
      enriched.vietqr_url = `https://img.vietqr.io/image/${bin}-${accNum}-compact2.png?amount=${amount}&accountName=${encodeURIComponent(accName)}`;
      enriched.bank_info = {
        bank_name: supplier.bin_bank || bin,
        bank_bin: bin,
        account_number: accNum,
        account_holder: accName,
        type: "supplier",
      };
    } else if (defaultShopBankInfo) {
      const amount = Math.round(effectivePrice);
      enriched.vietqr_url = `https://img.vietqr.io/image/${defaultShopBankInfo.bin}-${defaultShopBankInfo.accNum}-compact2.png?amount=${amount}&accountName=${encodeURIComponent(defaultShopBankInfo.accName)}`;
      enriched.bank_info = {
        bank_name: defaultShopBankInfo.bankName,
        bank_bin: defaultShopBankInfo.bankBin,
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
            bank_bin: defaultBank.bank_bin || defaultBank.bankBin || bin,
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
 * Lấy chi tiết đơn hàng theo ID (Tự động nạp batch info & đối chiếu Catalog)
 */
async function getOrderById(id) {
  const order = await getOrderTable().where({ id: Number(id) }).first();
  if (!order) return null;
  const [enriched] = await attachBatchSupplierAndQrInfo([order]);
  return enriched || null;
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
    const basePrice = payload.gross_selling_price != null ? Number(payload.gross_selling_price) : rawPrice;
    const status = payload.status || (isMavn ? ORDER_STATUS.PAID : ORDER_STATUS.UNPAID);

    let finalPrice = basePrice;
    if (status === ORDER_STATUS.UNPAID || status === ORDER_STATUS.RENEW_REQUIRED) {
      if (basePrice > 0) {
        const suffix = await getAvailableSuffix(trx);
        finalPrice = applySuffixToPrice(basePrice, suffix);
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
      gross_selling_price: isMavn ? 0 : basePrice,
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

    const isMavnOrder = isMavn || String(id_order).toUpperCase().startsWith("MAVN");
    const shouldSyncWarehouseOrPackage = isMavnOrder && (payload.save_to_package === true || payload.save_to_warehouse === true);
    if (shouldSyncWarehouseOrPackage) {
      try {
        await trx.savepoint(async (subTrx) => {
          const isSaveToWarehouse = payload.save_to_warehouse === true;
          const isSaveToPackage = payload.save_to_package === true;
          const accountUsername = payload.information_order
            ? String(payload.information_order).trim().toLowerCase()
            : (payload.slot ? (payload.slot.split('|')[0] || payload.customer).trim().toLowerCase() : String(payload.customer || "mavryk").trim().toLowerCase());

          let productName = payload.information_order || "Dịch vụ";
          const prodIdToLookup = newOrderData.id_product || payload.id_product;
          if (prodIdToLookup) {
            try {
              const numProdId = Number(prodIdToLookup);
              const variantQuery = subTrx(TABLES.VARIANT)
                .leftJoin(TABLES.PRODUCT, `${TABLES.PRODUCT}.id`, `${TABLES.VARIANT}.product_id`)
                .select(
                  `${TABLES.VARIANT}.display_name as variant_display`,
                  `${TABLES.VARIANT}.variant_name as variant_name`,
                  `${TABLES.PRODUCT}.package_name as parent_package_name`
                );
              if (!isNaN(numProdId) && numProdId > 0) {
                variantQuery.where(`${TABLES.VARIANT}.id`, numProdId);
              } else {
                variantQuery.where(function() {
                  this.whereILike(`${TABLES.VARIANT}.display_name`, String(prodIdToLookup))
                      .orWhereILike(`${TABLES.VARIANT}.variant_name`, String(prodIdToLookup));
                });
              }
              const variantRow = await variantQuery.first();
              if (variantRow) {
                productName = variantRow.parent_package_name || variantRow.variant_name || variantRow.variant_display || productName;
              }
            } catch (e) {
              console.log("[OrderService] Không resolve được sản phẩm chính cho kho:", e.message);
            }
          }

          let pName = await subTrx(TABLES.PRODUCT_NAMES)
            .whereRaw("LOWER(name) = ?", [productName.toLowerCase().trim()])
            .first();

          let nameId = pName?.id;
          if (!nameId && (isSaveToWarehouse || isSaveToPackage)) {
            const [insertedP] = await subTrx(TABLES.PRODUCT_NAMES)
              .insert({ name: productName.trim() })
              .returning("id");
            nameId = insertedP.id || insertedP;
          }

          let stockId = null;
          if (accountUsername) {
            let stock = await subTrx(TABLES.PRODUCT_KEYS)
              .whereRaw("LOWER(account_username) = ?", [accountUsername])
              .first();

            stockId = stock?.id;
            if (!stockId && (isSaveToWarehouse || isSaveToPackage)) {
              const [newStock] = await subTrx(TABLES.PRODUCT_KEYS)
                .insert({
                  account_username: accountUsername,
                  created_at: new Date(),
                })
                .returning("*");
              stockId = newStock.id;
            }
          }

          if (stockId && nameId && isSaveToWarehouse) {
            const existingService = await subTrx(TABLES.STOCK_SERVICES)
              .where({
                account_id: stockId,
                name_id: nameId,
              })
              .first();

            if (existingService) {
              // Đã có trong kho -> Luôn đồng bộ dữ liệu mới (kể cả khi không lưu kho)
              const updateData = {
                password: payload.warehouse_password || payload.slot || existingService.password,
                expired_at: payload.expired_at ? new Date(payload.expired_at) : existingService.expired_at,
                status: "AVAILABLE",
                service_note: payload.note || existingService.service_note,
                updated_at: new Date(),
              };
              if (payload.warehouse_backup_email !== undefined && payload.warehouse_backup_email !== "") {
                updateData.backup_email = payload.warehouse_backup_email;
              }
              if (payload.warehouse_two_fa !== undefined && payload.warehouse_two_fa !== "") {
                updateData.two_fa = payload.warehouse_two_fa;
              }
              await subTrx(TABLES.STOCK_SERVICES)
                .where({ id: existingService.id })
                .update(updateData);
              console.log(`✅ [WarehouseSync] Đã đồng bộ dữ liệu mới cho tài khoản "${accountUsername}" từ đơn ${id_order}`);
            } else {
              // Chưa có trong kho nhưng bật lưu kho -> tạo mới
              await subTrx(TABLES.STOCK_SERVICES).insert({
                account_id: stockId,
                name_id: nameId,
                slot_index: 1,
                password: payload.warehouse_password || payload.slot || null,
                backup_email: payload.warehouse_backup_email || "",
                two_fa: payload.warehouse_two_fa || null,
                expired_at: payload.expired_at ? new Date(payload.expired_at) : null,
                status: "AVAILABLE",
                service_note: payload.note || null,
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
            const existingPackage = await subTrx(TABLES.PACKAGE_PRODUCT)
              .where({
                product_name_id: nameId,
                account_id: stockId,
              })
              .first();

            if (!existingPackage) {
              let storageAccountId = null;
              if (payload.storage_account_username && String(payload.storage_account_username).trim()) {
                const storageAccUser = String(payload.storage_account_username).trim().toLowerCase();
                let storageStock = await subTrx(TABLES.PRODUCT_KEYS)
                  .whereRaw("LOWER(account_username) = ?", [storageAccUser])
                  .first();
                if (storageStock) {
                  storageAccountId = storageStock.id;
                } else {
                  const [newStorageStock] = await subTrx(TABLES.PRODUCT_KEYS)
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
                const sup = await subTrx(TABLES.SUPPLIER).where("id", Number(supplierName)).first();
                if (sup) supplierName = sup.supplier_name || sup.ncc_name || supplierName;
              }

              await subTrx(TABLES.PACKAGE_PRODUCT).insert({
                product_name_id: nameId,
                account_id: stockId,
                package_name: productName.trim(),
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
        });
      } catch (err) {
        console.error("[OrderService] Lỗi tự động lưu/đồng bộ kho/gói:", err.message);
      }
    }


    // 5. Tự động ghi nhận log chi phí NCC cho đơn nhập hàng (MAVN)
    const importCost = Number(createdOrder.cost || 0);
    const isSupplierMavryk = await isMavrykSupplier(trx, createdOrder);
    if (isMavn && !isSupplierMavryk && importCost > 0) {
      let supplyId = createdOrder.supply_id ? Number(createdOrder.supply_id) : null;
      if (!supplyId) {
        const defaultSupplier = await trx(TABLES.SUPPLIER).orderBy("id", "asc").first();
        supplyId = defaultSupplier ? defaultSupplier.id : 1;
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

    if (!isSupplierMavryk && isMavn && Number(createdOrder.cost) > 0) {
      emitOrderEvent(trx, EVENTS.ORDER_IMPORT_CREATED, {
        orderId: createdOrder.id,
        id_order: createdOrder.id_order,
        orderCode: createdOrder.id_order,
        cost: Number(createdOrder.cost),
        order_date: createdOrder.order_date,
        created_at: createdOrder.created_at,
        customer: createdOrder.customer,
        isSupplierMavryk,
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

    const nextStatus = payload.status !== undefined ? payload.status : existingOrder.status;
    const isPendingPayment = nextStatus === ORDER_STATUS.UNPAID || nextStatus === ORDER_STATUS.RENEW_REQUIRED;

    if (isMavn) {
      if (payload.cost !== undefined) {
        updateFields.cost = Number(payload.cost);
      } else if (payload.price !== undefined && (!existingOrder.cost || Number(existingOrder.cost) === 0)) {
        updateFields.cost = Number(payload.price);
      }
      updateFields.price = 0;
      updateFields.gross_selling_price = 0;
    } else if (isPendingPayment) {
      // Đơn bán hàng ở trạng thái chờ thanh toán / cần gia hạn:
      // BẮT BUỘC CỐ ĐỊNH SLOT SUFFIX của đơn này (1..100)
      const existingSuffix = extractSlotSuffix(existingOrder);

      // Xác định đúng giá gốc sản phẩm (KHÔNG LÀM TRÒN!)
      let basePrice = null;
      if (payload.gross_selling_price !== undefined && Number(payload.gross_selling_price) > 0) {
        basePrice = Number(payload.gross_selling_price);
      } else if (payload.price !== undefined && Number(payload.price) > 0) {
        // Nếu payload.price gửi lên trùng khớp với price cũ của đơn (không đổi sản phẩm):
        if (existingSuffix && Math.round(Number(payload.price)) === Math.round(Number(existingOrder.price || 0))) {
          basePrice = existingOrder.gross_selling_price != null
            ? Number(existingOrder.gross_selling_price)
            : (Number(payload.price) - existingSuffix);
        } else {
          basePrice = Number(payload.price);
        }
      } else {
        basePrice = Number(existingOrder.gross_selling_price != null ? existingOrder.gross_selling_price : existingOrder.price || 0);
      }

      // Giữ nguyên đúng giá sản phẩm không làm tròn
      if (basePrice > 0) {
        // Cố định slot suffix: Nếu đơn đã có suffix thì giữ nguyên, chỉ cấp mới nếu đơn chưa hề có suffix
        const suffixToUse = existingSuffix || (await getAvailableSuffix(trx, existingOrder.id));
        updateFields.gross_selling_price = basePrice;
        updateFields.price = applySuffixToPrice(basePrice, suffixToUse);
      } else {
        updateFields.gross_selling_price = 0;
        updateFields.price = 0;
      }

      if (payload.cost !== undefined) updateFields.cost = Number(payload.cost);
    } else {
      // Trạng thái đã thanh toán hoặc hủy (PAID, REFUNDED, CANCELED):
      if (payload.price !== undefined) updateFields.price = Number(payload.price);
      if (payload.gross_selling_price !== undefined) updateFields.gross_selling_price = Number(payload.gross_selling_price);
      if (payload.cost !== undefined) updateFields.cost = Number(payload.cost);
    }

    if (payload.status !== undefined) {
      updateFields.status = payload.status;
      if (payload.status === ORDER_STATUS.PAID) {
        updateFields.was_paid = true;
      }
    }

    if (payload.payment_method !== undefined) updateFields.payment_method = payload.payment_method;
    if (payload.note !== undefined) updateFields.note = payload.note;
    if (payload.days !== undefined) updateFields.days = Number(payload.days);
    if (payload.order_date !== undefined) updateFields.order_date = payload.order_date || null;
    if (payload.expired_at !== undefined) updateFields.expired_at = payload.expired_at || null;
    const oldSupplyId = existingOrder.supply_id ? Number(existingOrder.supply_id) : null;
    let resolvedNewSupplyId = oldSupplyId;
    if (payload.supply_id !== undefined) {
      resolvedNewSupplyId = await resolveSupplyId(trx, payload.supply_id);
      updateFields.supply_id = resolvedNewSupplyId;
    }

    const isSupplierChanged = updateFields.supply_id !== undefined && resolvedNewSupplyId !== oldSupplyId;
    const isOrderPaid = existingOrder.status === ORDER_STATUS.PAID || Boolean(existingOrder.was_paid);

    if (isOrderPaid && isSupplierChanged) {
      // 1. Tính số ngày còn lại của gói dịch vụ
      const totalDays = Math.max(Number(existingOrder.days || 365), 1);
      let remainingDays = 0;
      const targetExpiryStr = updateFields.expired_at !== undefined ? updateFields.expired_at : existingOrder.expired_at;
      if (targetExpiryStr) {
        const expiry = new Date(targetExpiryStr);
        if (!isNaN(expiry.getTime())) {
          expiry.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffTime = expiry.getTime() - today.getTime();
          remainingDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        }
      }

      // 2. Với NCC cũ (oldSupplyId): nếu là NCC ngoài (khác Mavryk/ID 1)
      const isOldMavryk = !oldSupplyId || oldSupplyId === 1;
      let refundOldAmount = 0;
      if (!isOldMavryk) {
        const oldPositiveLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
          .where({ order_list_id: existingOrder.id, supply_id: oldSupplyId })
          .where("import_cost", ">", 0)
          .orderBy("id", "desc")
          .first();
        const baseOldCost = oldPositiveLog ? Number(oldPositiveLog.import_cost || 0) : Number(existingOrder.cost || 0);
        refundOldAmount = remainingDays > 0 ? Math.round((baseOldCost / totalDays) * remainingDays) : 0;

        if (refundOldAmount > 0) {
          await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
            order_list_id: existingOrder.id,
            supply_id: oldSupplyId,
            id_order: existingOrder.id_order,
            import_cost: -refundOldAmount,
            ncc_payment_status: SUPPLIER_PAYMENT_STATUS.UNPAID,
            logged_at: trx.fn.now(),
          });
        }
      }

      // 3. Với NCC mới (resolvedNewSupplyId): nếu là NCC ngoài
      const isNewMavryk = !resolvedNewSupplyId || resolvedNewSupplyId === 1;
      let newProratedCost = 0;
      if (!isNewMavryk) {
        let newPackagePrice = null;
        const targetProductId = updateFields.id_product !== undefined ? updateFields.id_product : existingOrder.id_product;
        if (targetProductId) {
          const sc = await trx(TABLES.SUPPLIER_COST)
            .where({ variant_id: Number(targetProductId), supplier_id: resolvedNewSupplyId })
            .first();
          if (sc && Number(sc.price) > 0) {
            newPackagePrice = Number(sc.price);
          }
        }
        if (newPackagePrice == null) {
          if (payload.cost !== undefined && Number(payload.cost) > 0) {
            newPackagePrice = Number(payload.cost);
          } else {
            newPackagePrice = Number(existingOrder.cost || 0);
          }
        }

        newProratedCost = remainingDays > 0 ? Math.round((newPackagePrice / totalDays) * remainingDays) : 0;
        if (newProratedCost > 0) {
          await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
            order_list_id: existingOrder.id,
            supply_id: resolvedNewSupplyId,
            id_order: existingOrder.id_order,
            import_cost: newProratedCost,
            ncc_payment_status: SUPPLIER_PAYMENT_STATUS.UNPAID,
            logged_at: trx.fn.now(),
          });
        }
        updateFields.cost = newProratedCost;
      } else {
        updateFields.cost = 0;
      }
    } else if (!isOrderPaid && isSupplierChanged && resolvedNewSupplyId) {
      await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
        .where({ order_list_id: existingOrder.id, ncc_payment_status: SUPPLIER_PAYMENT_STATUS.UNPAID })
        .update({
          supply_id: resolvedNewSupplyId,
          ...(updateFields.cost !== undefined ? { import_cost: updateFields.cost } : {}),
        });
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
      const renewal = await calculateNewExpiry(existingOrder, { trx, days: payload.days });
      const renewCost = payload.cost != null ? Number(payload.cost) : Number(existingOrder.cost || 0);

      const updateFields = {
        status: ORDER_STATUS.PAID,
        was_paid: true,
        order_date: renewal.newOrderDate,
        expired_at: renewal.newExpiredAt,
        days: renewal.days,
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

      // B. Quản lý công nợ NCC: Đối với Mavryk (chủ shop) thì KHÔNG TẠO LOG trong NCC
      const supplyId = updatedOrder.supply_id ? Number(updatedOrder.supply_id) : null;
      const isSupplierMavryk = await isMavrykSupplier(trx, updatedOrder);

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
        cost: isSupplierMavryk ? 0 : renewCost,
        isSupplierMavryk,
        supply_id: supplyId,
        status: updatedOrder.status,
        isRenewal: true,
        action: "RENEW_IMPORT",
      });

      emitOrderEvent(trx, EVENTS.ORDER_RENEWED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        newOrderDate: updatedOrder.order_date,
        newExpiredAt: updatedOrder.expired_at,
        daysAdded: renewal.days,
        monthsAdded: renewal.monthsAdded,
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
        summary: `Gia hạn thành công đơn nhập hàng #${updatedOrder.id_order} (Đã Thanh Toán, chu kỳ mới: ${updatedOrder.order_date} đến ${updatedOrder.expired_at})`,
        action: "RENEW_IMPORT",
      });

      return updatedOrder;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. XỬ LÝ CHO ĐƠN BÁN CỦA KHÁCH HÀNG (GIỮ NGUYÊN NHƯ CŨ)
    // ─────────────────────────────────────────────────────────────
    // Lấy đúng giá sản phẩm gia hạn theo Catalog hiện tại (KHÔNG LÀM TRÒN!)
    let basePrice = 0;
    if (payload.price != null && Number(payload.price) > 0) {
      basePrice = Number(payload.price);
    } else {
      const { catalogBasePrice } = await resolveOrderCatalogPricing(trx, existingOrder);
      basePrice = catalogBasePrice > 0
        ? catalogBasePrice
        : Number(existingOrder.gross_selling_price != null ? existingOrder.gross_selling_price : existingOrder.price || 0);
    }

    // Cấp phát 1 Slot Suffix (1..100) khả dụng không bị trùng cho số tiền này
    const suffix = await getAvailableSuffix(trx, existingOrder.id);
    const finalPrice = applySuffixToPrice(basePrice, suffix);

    const renewal = await calculateNewExpiry(existingOrder, { trx, days: payload.days });
    const days = renewal.days;

    const updateFields = {
      status: ORDER_STATUS.RENEW_REQUIRED,
      price: finalPrice,
      gross_selling_price: basePrice,
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
    if (status === ORDER_STATUS.CANCELED || status === "Đã Hủy") {
      throw new Error("Đơn hàng đã hủy không thể bị xóa vĩnh viễn.");
    }
    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const todayYMD = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];

    const isMavn = Boolean(
      (existingOrder.id_order && String(existingOrder.id_order).startsWith("MAVN")) ||
      (existingOrder.customer && isCustomerMavryk(existingOrder.customer))
    );

    const { excludeOrderFromPendingBatches } = require("@/domains/invoices/services/batchPaymentService");

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

    // 1. Đơn Cần Gia Hạn (RENEW_REQUIRED) -> Chuyển sang Tab "Hết Hạn" (EXPIRED)
    // Bảo lưu an toàn 100% dữ liệu tài khoản, mật khẩu, email của khách hàng
    if (status === ORDER_STATUS.RENEW_REQUIRED || status === "Cần Gia Hạn") {
      await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).update({
        status: ORDER_STATUS.EXPIRED,
        updated_at: trx.fn ? trx.fn.now() : new Date(),
      });

      // Tự động loại trừ khỏi các đợt gộp pending nếu có
      await excludeOrderFromPendingBatches(trx, existingOrder.id_order, "Đơn cần gia hạn chuyển sang Hết Hạn");

      const summary = `Đã chuyển đơn hàng #${existingOrder.id_order} của khách "${existingOrder.customer}" sang danh sách Hết Hạn`;

      emitOrderEvent(trx, EVENTS.ORDER_EXPIRED, {
        orderId: existingOrder.id,
        id_order: existingOrder.id_order,
        orderCode: existingOrder.id_order,
        customer: existingOrder.customer,
        price: existingOrder.price,
        order: { ...existingOrder, status: ORDER_STATUS.EXPIRED },
        summary,
        action: "ORDER_EXPIRED",
      });

      return { success: true, action: "expired", message: summary };
    }

    // 2. Đơn Đã Thanh Toán (PAID) -> Chuyển thành "Đã Hủy" (CANCELED)
    if (status === ORDER_STATUS.PAID || status === "Đã Thanh Toán") {
      await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).update({
        status: ORDER_STATUS.CANCELED,
        canceled_at: existingOrder.canceled_at || todayYMD,
        updated_at: trx.fn ? trx.fn.now() : new Date(),
      });

      // Tự động loại trừ khỏi các đợt gộp pending nếu có
      await excludeOrderFromPendingBatches(trx, existingOrder.id_order, "Đơn đã thanh toán bị hủy");

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
    }

    // 3. Đơn Chưa Thanh Toán (UNPAID) hoặc đơn nháp khác -> Xóa vĩnh viễn (Hard Delete)
    await excludeOrderFromPendingBatches(trx, existingOrder.id_order, "Đơn chưa thanh toán bị xóa");

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
    let newOrderDate = null;
    let renewalDays = null;
    if (isRenewal) {
      const renewal = await calculateNewExpiry(existingOrder, { trx });
      newOrderDate = renewal.newOrderDate;
      newExpiredAt = renewal.newExpiredAt;
      renewalDays = renewal.days;
      updateFields.order_date = newOrderDate;
      updateFields.expired_at = newExpiredAt;
      updateFields.days = renewalDays;
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: Number(id) })
      .update(updateFields)
      .returning("*");

    const isSupplierMavryk = await isMavrykSupplier(trx, updatedOrder);
    const existingLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ order_list_id: updatedOrder.id })
      .first();

    const importCost = Number(updatedOrder.cost || 0);
    if (!isSupplierMavryk && !existingLog && importCost > 0) {
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
    let newOrderDate = null;
    let renewalDays = null;
    let monthsAdded = 1;
    if (isRenewal) {
      const renewal = await calculateNewExpiry(order, { trx });
      newOrderDate = renewal.newOrderDate;
      newExpiredAt = renewal.newExpiredAt;
      renewalDays = renewal.days;
      monthsAdded = renewal.monthsAdded;
      updateFields.order_date = newOrderDate;
      updateFields.expired_at = newExpiredAt;
      updateFields.days = renewalDays;
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: order.id })
      .update(updateFields)
      .returning("*");

    const payAmount = amount != null ? Number(amount) : Number(updatedOrder.price || 0);
    const isSupplierMavryk = await isMavrykSupplier(trx, updatedOrder);
    const effectiveCost = isSupplierMavryk ? 0 : Number(updatedOrder.cost || 0);

    emitOrderEvent(trx, EVENTS.ORDER_PAID, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      amount: payAmount,
      price: Number(updatedOrder.price || 0),
      cost: effectiveCost,
      isSupplierMavryk,
      supply_id: updatedOrder.supply_id,
      order_date: updatedOrder.order_date,
      status: updatedOrder.status,
      isRenewal,
      action: options.action || "COMPLETED",
    });

    if (isRenewal) {
      emitOrderEvent(trx, EVENTS.ORDER_RENEWED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        id_product: updatedOrder.id_product,
        price: payAmount,
        customer: updatedOrder.customer,
        newOrderDate: updatedOrder.order_date,
        newExpiredAt: updatedOrder.expired_at,
        daysAdded: renewalDays,
        monthsAdded,
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
      const renewal = await calculateNewExpiry(order, { trx });
      updateFields.order_date = renewal.newOrderDate;
      updateFields.expired_at = renewal.newExpiredAt;
      updateFields.days = renewal.days;
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: order.id })
      .update(updateFields)
      .returning("*");

    const isSupplierMavryk = await isMavrykSupplier(trx, updatedOrder);
    const existingLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ order_list_id: updatedOrder.id })
      .first();
    const importCost = Number(updatedOrder.cost || 0);
    if (!isSupplierMavryk && !existingLog && importCost > 0) {
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
  getDefaultShopBank,
};
