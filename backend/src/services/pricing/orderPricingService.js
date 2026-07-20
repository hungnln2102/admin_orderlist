const { db } = require("@/db");
const { ORDERS_SCHEMA } = require("@/config/dbSchema");
const { TABLES, COLS } = require("@/domains/orders/controller/constants");
const {
  normalizeMoney,
  resolveOrderKind,
} = require("@/services/pricing/core");
const { getTiers } = require("@/services/pricing/tierCache");
const {
  findSupplierIdByName,
} = require("@/domains/supplies/services/supplierLookupService");
const {
  findMaxSupplierCostPrice,
  findSupplierCostPrice,
} = require("@/domains/supplies/services/supplierCostService");

class PricingHttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const fetchVariantPricing = async (productNameOrId) => {
  const raw = String(productNameOrId ?? "").trim();
  if (!raw) return null;

  const numericId = Number(raw);
  const baseQuery = db(TABLES.variant)
    .select(`${TABLES.variant}.${COLS.VARIANT.ID} as variant_id`)
    .orderBy(`${TABLES.variant}.${COLS.VARIANT.ID}`, "asc")
    .limit(1);

  if (Number.isFinite(numericId) && numericId > 0) {
    baseQuery.where(`${TABLES.variant}.${COLS.VARIANT.ID}`, numericId);
  } else {
    baseQuery.where((qb) => {
      qb.where(`${TABLES.variant}.${COLS.VARIANT.DISPLAY_NAME}`, raw).orWhere(
        `${TABLES.variant}.${COLS.VARIANT.VARIANT_NAME}`,
        raw
      );
    });
  }

  const row = await baseQuery.first();
  if (!row) return null;

  const rows = await db(TABLES.variantMargin)
    .join(TABLES.pricingTier, `${TABLES.pricingTier}.id`, `${TABLES.variantMargin}.tier_id`)
    .where(`${TABLES.variantMargin}.variant_id`, row.variant_id)
    .select(
      `${TABLES.pricingTier}.key as tier_key`,
      `${TABLES.variantMargin}.margin_ratio`,
      `${TABLES.variantMargin}.price`
    );

  const marginMap = {};
  const priceMap = {};
  for (const item of rows) {
    marginMap[item.tier_key] = item.margin_ratio;
    priceMap[item.tier_key] = item.price;
  }

  return {
    variantId: row.variant_id,
    pctCtv: marginMap.ctv ?? null,
    pctKhach: marginMap.customer ?? null,
    pctPromo: marginMap.promo ?? null,
    pctStu: marginMap.student ?? null,
    tierPrices: priceMap,
  };
};

const resolveEffectiveSupplyId = async ({ suppliedId, orderRow, customerType }) => {
  let effectiveSupplyId = Number(suppliedId);

  const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
  if (!effectiveSupplyId && orderRow?.[supplyIdCol] != null) {
    effectiveSupplyId = Number(orderRow[supplyIdCol]) || 0;
  }

  if (!effectiveSupplyId && customerType) {
    effectiveSupplyId = (await findSupplierIdByName(customerType)) || 0;
  }

  return effectiveSupplyId;
};

const calculateOrderPricing = async ({
  supplyId,
  productKey,
  orderId,
  customerType,
}) => {
  const normalizedProductKey = String(productKey || "").trim();
  if (!normalizedProductKey) {
    throw new PricingHttpError(
      400,
      "Tên sản phẩm hoặc variant_id bắt buộc."
    );
  }

  const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
  const normalizedOrderId = String(orderId || "").trim();
  const orderRow = normalizedOrderId
    ? await db(TABLES.orderList)
        .select("id_product", "price", "cost", supplyIdCol)
        .where({ id_order: normalizedOrderId })
        .first()
    : null;

  const effectiveSupplyId = await resolveEffectiveSupplyId({
    suppliedId: supplyId,
    orderRow,
    customerType,
  });



  const variantPricing = await fetchVariantPricing(normalizedProductKey);
  if (!variantPricing?.variantId) {
    throw new PricingHttpError(400, "Không tìm thấy gói cho sản phẩm.");
  }

  let importBySource = 0;
  if (effectiveSupplyId) {
    const latestPriceBySource = await findSupplierCostPrice({
      supplierId: effectiveSupplyId,
      variantId: variantPricing.variantId,
      latest: true,
    });

    if (latestPriceBySource !== null) {
      importBySource = normalizeMoney(latestPriceBySource);
    }
  }

  if (importBySource <= 0 && orderRow?.cost) {
    importBySource = normalizeMoney(orderRow.cost);
  }

  const maxSupplyPrice = normalizeMoney(
    await findMaxSupplierCostPrice(variantPricing.variantId)
  );

  if (maxSupplyPrice <= 0 && importBySource <= 0) {
    throw new PricingHttpError(400, "Không có giá NCC");
  }

  const tierPrices = variantPricing.tierPrices || {};
  const toPrice = (value) => {
    const numeric = normalizeMoney(value);
    return numeric > 0 ? numeric : 0;
  };
  const ctvPrice = toPrice(tierPrices.ctv);
  const customerPrice = toPrice(tierPrices.customer);
  const promoPriceRaw = toPrice(tierPrices.promo);
  const studentPrice = toPrice(tierPrices.student);
  const importTierPrice = toPrice(tierPrices.import);

  const orderKind = await resolveOrderKind({
    orderId: normalizedOrderId,
    customerType,
  });
  const matchedTierKey = orderKind?.matchedTier?.key || null;
  const activeTiers = await getTiers();
  const hasCustomerTier = activeTiers.some((tier) => tier.key === "customer");
  const defaultTierKey = hasCustomerTier
    ? "customer"
    : (activeTiers[0]?.key || "customer");
  const selectedTierKey = matchedTierKey || defaultTierKey;
  const selectedTierPrice = toPrice(tierPrices[selectedTierKey]);

  const fallbackTierPrice = customerPrice || ctvPrice || promoPriceRaw || studentPrice || importTierPrice;
  const fallbackOrderPrice = normalizeMoney(orderRow?.price);
  const importFallbackPrice = importBySource > 0 ? importBySource : importTierPrice > 0 ? importTierPrice : maxSupplyPrice;
  const resolvedPrice = selectedTierPrice > 0
    ? selectedTierPrice
    : selectedTierKey === "gift"
      ? 0
    : selectedTierKey === "import" && importFallbackPrice > 0
      ? importFallbackPrice
    : fallbackTierPrice > 0
      ? fallbackTierPrice
    : fallbackOrderPrice > 0
      ? fallbackOrderPrice
      : 0;
  if (resolvedPrice <= 0 && selectedTierKey !== "gift") {
    throw new PricingHttpError(
      400,
      `Chưa cấu hình giá (price) cho tier '${selectedTierKey}' của variant ${variantPricing.variantId}.`
    );
  }

  const resolvedCostRaw = importBySource > 0
    ? importBySource
    : importTierPrice > 0
      ? importTierPrice
      : maxSupplyPrice;
  const resolvedCost = Math.max(0, Math.round(resolvedCostRaw));

  const retailPrice = customerPrice > 0 ? customerPrice : resolvedPrice;
  const promoPrice = promoPriceRaw > 0 ? promoPriceRaw : retailPrice;
  const resellPrice = ctvPrice > 0 ? ctvPrice : resolvedPrice;
  const promoAmount = Math.max(0, retailPrice - promoPrice);

  const pricingResult = {
    cost: resolvedCost,
    price: resolvedPrice,
    promoPrice,
    pricePromo: promoPrice,
    promo: promoAmount,
    resellPrice,
    customerPrice: retailPrice,
    totalPrice: resolvedPrice,
    days: 30,
    expiry_date: "",
    meta: {
      source: "variant_price",
      selectedTierKey,
      matchedTierKey,
      studentPrice: studentPrice > 0 ? studentPrice : retailPrice,
    },
  };

  return {
    ...pricingResult,
    gia_nhap: pricingResult.cost,
  };
};

module.exports = {
  PricingHttpError,
  calculateOrderPricing,
  fetchVariantPricing,
};
