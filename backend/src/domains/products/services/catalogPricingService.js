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

async function resolveOrderCatalogPricing(queryDb, order, batch) {
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
  const variant = batch ? await batch.findVariant(order) : await findCatalogVariant(dbClient, order);
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

  const prices = batch ? batch.prices.get(String(variant[V_COLS.ID])) : await dbClient(TABLES.VARIANT_PRICE)
    .where({ [VP_COLS.VARIANT_ID]: variant[V_COLS.ID] });
  const catalogBasePrice = selectCatalogPrice(prefix, variant, Array.isArray(prices) ? prices : []) || getFallbackPrice(order);

  // Tra cứu giá nhập mới nhất của NCC từ catalog (supplier_cost)
  let catalogCostPrice = fallbackCost;
  let resolvedSupplierId = order?.[O_COLS.SUPPLY_ID] ? Number(order[O_COLS.SUPPLY_ID]) : null;

  try {
    let scQuery = batch ? null : dbClient(TABLES.SUPPLIER_COST).where({ [SC_COLS.VARIANT_ID]: variant[V_COLS.ID] });
    if (resolvedSupplierId && scQuery && typeof scQuery.andWhere === "function") {
      scQuery = scQuery.andWhere({ [SC_COLS.SUPPLIER_ID]: resolvedSupplierId });
    } else if (scQuery && typeof scQuery.orderBy === "function") {
      scQuery = scQuery.orderBy(SC_COLS.PRICE, "asc");
    }

    if (batch || (scQuery && typeof scQuery.first === "function")) {
      const costs = batch?.costs.get(String(variant[V_COLS.ID])) || [];
      const supplierCostRow = batch
        ? (resolvedSupplierId ? costs.find((row) => Number(row[SC_COLS.SUPPLIER_ID]) === resolvedSupplierId) : costs[0])
        : await scQuery.first();
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

function groupByVariant(rows, column) {
  const grouped = new Map();
  for (const row of rows) {
    const id = String(row[column]);
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(row);
  }
  return grouped;
}

async function resolveOrdersWithCatalogPrices(queryDb, orders = []) {
  if (!orders?.length) return [];
  const client = queryDb || db;
  const billable = orders.filter((order) => getOrderPrefix(order[O_COLS.ID_ORDER]) !== "MAVT");
  const ids = [...new Set(billable.map((order) => Number(order[O_COLS.ID_PRODUCT]))
    .filter((id) => Number.isFinite(id) && id > 0))];
  const variants = ids.length ? await client(TABLES.VARIANT).whereIn(V_COLS.ID, ids) : [];
  const byId = new Map(variants.map((row) => [Number(row[V_COLS.ID]), row]));
  const legacy = new Map();
  const resolved = new Map();
  for (const order of billable) {
    let variant = byId.get(Number(order[O_COLS.ID_PRODUCT]));
    if (!variant) {
      const key = JSON.stringify([order[O_COLS.ID_PRODUCT], order[O_COLS.INFORMATION_ORDER]]);
      if (!legacy.has(key)) legacy.set(key, await findCatalogVariant(client, order));
      variant = legacy.get(key);
    }
    resolved.set(order, variant);
  }

  const matchedIds = [...new Set([...resolved.values()].filter(Boolean).map((row) => row[V_COLS.ID]))];
  const [prices, costs] = matchedIds.length ? await Promise.all([
    client(TABLES.VARIANT_PRICE).whereIn(VP_COLS.VARIANT_ID, matchedIds),
    client(TABLES.SUPPLIER_COST).whereIn(SC_COLS.VARIANT_ID, matchedIds).orderBy(SC_COLS.PRICE, "asc"),
  ]) : [[], []];
  const batch = {
    findVariant: (order) => resolved.get(order),
    prices: groupByVariant(prices, VP_COLS.VARIANT_ID),
    costs: groupByVariant(costs, SC_COLS.VARIANT_ID),
  };
  return Promise.all(orders.map(async (order) => {
    const pricing = await resolveOrderCatalogPricing(client, order, batch);
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
