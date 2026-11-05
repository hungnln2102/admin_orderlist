const { db, TABLES, COLS } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { extractSlotSuffix, getAvailableSuffix, applySuffixToPrice } = require("@/domains/payments/services/slotSuffixService");

const O_COLS = COLS.ORDER_LIST;
const V_COLS = COLS.VARIANT;
const VP_COLS = COLS.VARIANT_PRICE;
const SC_COLS = COLS.SUPPLIER_COST;

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

function getFallbackPrice(order) {
  return Number(order?.[O_COLS.GROSS_SELLING_PRICE] ?? order?.[O_COLS.PRICE] ?? 0);
}

function selectCatalogPrice(prefix, variant, prices) {
  const priceMap = new Map(prices.map((price) => [
    Number(price[VP_COLS.TIER_ID]),
    Number(price[VP_COLS.PRICE] || 0),
  ]));
  const ctv = priceMap.get(1) || 0;
  const retail = priceMap.get(2) || 0;
  const promo = priceMap.get(3) || 0;
  const student = priceMap.get(4) || 0;
  const base = Number(variant[V_COLS.BASE_PRICE] || 0);

  if (prefix === "MAVC") return ctv || retail || base;
  if (prefix === "MAVL") return retail || ctv || base;
  if (prefix === "MAVK") return promo || retail || base;
  if (prefix === "MAVS") return student || ctv || retail || base;
  return retail || base;
}

async function findCatalogVariant(queryDb, order) {
  const numericProductId = Number(order?.[O_COLS.ID_PRODUCT]);
  if (Number.isFinite(numericProductId) && numericProductId > 0) {
    const variant = await queryDb(TABLES.VARIANT).where({ [V_COLS.ID]: numericProductId }).first();
    if (variant) return variant;
  }

  for (const candidate of [order?.[O_COLS.ID_PRODUCT], order?.[O_COLS.INFORMATION_ORDER]]) {
    if (!candidate) continue;
    const text = String(candidate).trim();
    if (!text) continue;
    const variant = await queryDb(TABLES.VARIANT)
      .whereILike(V_COLS.DISPLAY_NAME, text)
      .orWhereILike(V_COLS.VARIANT_NAME, text)
      .first();
    if (variant) return variant;
  }
  return null;
}

async function resolveOrderCatalogPricing(queryDb, order) {
  if (!order) {
    return {
      catalogBasePrice: 0,
      catalogCostPrice: 0,
      isActive: true,
      variantId: null,
      displayName: null,
      variantName: null,
      supplierId: null,
    };
  }

  const prefix = getOrderPrefix(order[O_COLS.ID_ORDER]);
  if (prefix === "MAVT") {
    return {
      catalogBasePrice: 0,
      catalogCostPrice: 0,
      isActive: true,
      variantId: null,
      displayName: null,
      variantName: null,
      supplierId: null,
    };
  }

  const dbClient = queryDb || db;
  const variant = await findCatalogVariant(dbClient, order);
  const fallbackCost = Number(order?.[O_COLS.COST] || 0);

  if (!variant) {
    return {
      catalogBasePrice: getFallbackPrice(order),
      catalogCostPrice: fallbackCost,
      isActive: true,
      variantId: null,
      displayName: null,
      variantName: null,
      supplierId: order?.[O_COLS.SUPPLY_ID] ? Number(order[O_COLS.SUPPLY_ID]) : null,
    };
  }

  const prices = await dbClient(TABLES.VARIANT_PRICE)
    .where({ [VP_COLS.VARIANT_ID]: variant[V_COLS.ID] });
  const catalogBasePrice = selectCatalogPrice(prefix, variant, Array.isArray(prices) ? prices : []) || getFallbackPrice(order);

  // Tra cứu giá nhập mới nhất của NCC từ catalog (supplier_cost)
  let catalogCostPrice = fallbackCost;
  let resolvedSupplierId = order?.[O_COLS.SUPPLY_ID] ? Number(order[O_COLS.SUPPLY_ID]) : null;

  try {
    let scQuery = dbClient(TABLES.SUPPLIER_COST).where({ [SC_COLS.VARIANT_ID]: variant[V_COLS.ID] });
    if (resolvedSupplierId && typeof scQuery.andWhere === "function") {
      scQuery = scQuery.andWhere({ [SC_COLS.SUPPLIER_ID]: resolvedSupplierId });
    } else if (typeof scQuery.orderBy === "function") {
      scQuery = scQuery.orderBy(SC_COLS.PRICE, "asc");
    }

    if (scQuery && typeof scQuery.first === "function") {
      const supplierCostRow = await scQuery.first();
      if (supplierCostRow && Number.isFinite(Number(supplierCostRow[SC_COLS.PRICE]))) {
        catalogCostPrice = Number(supplierCostRow[SC_COLS.PRICE]);
        if (!resolvedSupplierId) {
          resolvedSupplierId = Number(supplierCostRow[SC_COLS.SUPPLIER_ID]);
        }
      }
    }
  } catch (err) {
    // Fallback an toàn nếu môi trường test hoặc query supplier_cost gặp lỗi
    catalogCostPrice = fallbackCost;
  }

  return {
    catalogBasePrice,
    catalogCostPrice,
    isActive: variant[V_COLS.IS_ACTIVE] !== false,
    variantId: variant[V_COLS.ID],
    displayName: variant[V_COLS.DISPLAY_NAME] || null,
    variantName: variant[V_COLS.VARIANT_NAME] || null,
    supplierId: resolvedSupplierId,
  };
}

async function resolveOrdersWithCatalogPrices(queryDb, orders = []) {
  return Promise.all((orders || []).map(async (order) => {
    const pricing = await resolveOrderCatalogPricing(queryDb, order);
    return {
      ...order,
      orderPrefix: getOrderPrefix(order[O_COLS.ID_ORDER]),
      display_name: pricing.displayName || order.display_name || null,
      variant_name: pricing.variantName || null,
      catalogBasePrice: pricing.catalogBasePrice,
      catalogCostPrice: pricing.catalogCostPrice,
    };
  }));
}

async function syncRenewRequiredOrdersPricing(queryDb = null, variantId = null) {
  const dbClient = queryDb || db;
  let ordersQuery = dbClient(TABLES.ORDER_LIST)
    .whereIn(O_COLS.STATUS, [ORDER_STATUS.RENEW_REQUIRED, "Cần Gia Hạn"]);

  if (variantId) {
    const value = Number(variantId);
    ordersQuery = ordersQuery.andWhere(function filterVariantOrders() {
      this.where(O_COLS.ID_PRODUCT, value).orWhere(O_COLS.ID_PRODUCT, String(value));
    });
  }

  const orders = await ordersQuery.select(
    O_COLS.ID,
    O_COLS.ID_ORDER,
    O_COLS.ID_PRODUCT,
    O_COLS.INFORMATION_ORDER,
    O_COLS.PRICE,
    O_COLS.GROSS_SELLING_PRICE,
    O_COLS.COST,
    O_COLS.SUPPLY_ID,
    O_COLS.STATUS,
  );
  let updatedCount = 0;

  for (const order of orders) {
    const { catalogBasePrice, catalogCostPrice } = await resolveOrderCatalogPricing(dbClient, order);
    if (catalogBasePrice <= 0) continue;

    const suffix = extractSlotSuffix(order) || await getAvailableSuffix(dbClient, order[O_COLS.ID]);
    const price = applySuffixToPrice(catalogBasePrice, suffix);
    const isCostSame = catalogCostPrice == null || Number(order[O_COLS.COST] || 0) === catalogCostPrice;

    if (
      Number(order[O_COLS.GROSS_SELLING_PRICE] || 0) === catalogBasePrice
      && Number(order[O_COLS.PRICE] || 0) === price
      && isCostSame
    ) continue;

    const updateData = {
      [O_COLS.GROSS_SELLING_PRICE]: catalogBasePrice,
      [O_COLS.PRICE]: price,
    };
    if (catalogCostPrice != null && Number.isFinite(catalogCostPrice)) {
      updateData[O_COLS.COST] = catalogCostPrice;
    }

    updatedCount += await dbClient(TABLES.ORDER_LIST)
      .whereIn(O_COLS.STATUS, [ORDER_STATUS.RENEW_REQUIRED, "Cần Gia Hạn"])
      .where({ [O_COLS.ID]: order[O_COLS.ID] })
      .update(updateData);
  }

  return { success: true, updatedCount };
}

module.exports = {
  getOrderPrefix,
  selectCatalogPrice,
  resolveOrderCatalogPricing,
  resolveOrdersWithCatalogPrices,
  syncRenewRequiredOrdersPricing,
};
