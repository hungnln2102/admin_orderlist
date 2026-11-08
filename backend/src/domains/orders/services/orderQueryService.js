const { db, TABLES, COLS } = require("@/db");
const { getAvailableSuffix, applySuffixToPrice, extractSlotSuffix } = require("@/domains/payments/services/slotSuffixService");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { resolveOrderCatalogPricing, getOrderPrefix, selectCatalogPrice } = require("@/domains/products/services/catalogPricingService");

const O_COLS = COLS.ORDER_LIST;
const getOrderTable = (trx) => (trx || db)(TABLES.ORDER_LIST);

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
 * Lấy danh sách đơn hàng có phân trang, lọc theo tab & tìm kiếm (Tối ưu SQL Aggregation)
 */
async function getOrders({ page = 1, limit = 20, search = "", status = "", tab = "", includeStats = true } = {}) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (page - 1) * limit;
  const shouldIncludeStats = includeStats !== false;

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

/**
 * Lấy chi tiết đơn hàng theo ID (Tự động nạp batch info & đối chiếu Catalog)
 */
async function getOrderById(id) {
  const order = await getOrderTable().where({ id: Number(id) }).first();
  if (!order) return null;
  const [enriched] = await attachBatchSupplierAndQrInfo([order]);
  return enriched || null;
}

module.exports = {
  getOrders,
  getOrderById,
  getDefaultShopBank,
  attachBatchSupplierAndQrInfo,
  attachSupplierInfo,
  attachVietQrToOrder,
  applyCanceledFilter,
  applyExpiredFilter,
  applyImportFilter,
  applyActiveFilter,
};

