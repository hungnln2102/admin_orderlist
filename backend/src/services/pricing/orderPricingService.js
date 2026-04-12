const { db } = require("../../db");
const { ORDERS_SCHEMA } = require("../../config/dbSchema");
const { TABLES, COLS } = require("../../controllers/Order/constants");
const {
  calculateOrderPricingFromResolvedValues,
  normalizeMoney,
} = require("./core");
const { isMavrykShopSupplierName } = require("../../utils/orderHelpers");

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

  const margins = await db(TABLES.variantMargin)
    .join(TABLES.pricingTier, `${TABLES.pricingTier}.id`, `${TABLES.variantMargin}.tier_id`)
    .where(`${TABLES.variantMargin}.variant_id`, row.variant_id)
    .select(`${TABLES.pricingTier}.key as tier_key`, `${TABLES.variantMargin}.margin_ratio`);

  const marginMap = {};
  for (const m of margins) marginMap[m.tier_key] = m.margin_ratio;

  return {
    variantId: row.variant_id,
    pctCtv: marginMap.ctv ?? null,
    pctKhach: marginMap.customer ?? null,
    pctPromo: marginMap.promo ?? null,
    pctStu: marginMap.student ?? null,
  };
};

const resolveEffectiveSupplyId = async ({ suppliedId, orderRow, customerType }) => {
  let effectiveSupplyId = Number(suppliedId);

  const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
  if (!effectiveSupplyId && orderRow?.[supplyIdCol] != null) {
    effectiveSupplyId = Number(orderRow[supplyIdCol]) || 0;
  }

  if (!effectiveSupplyId && customerType) {
    const supplier = await db(TABLES.supplier)
      .where({ supplier_name: customerType })
      .first();
    if (supplier?.id) {
      effectiveSupplyId = Number(supplier.id) || 0;
    }
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

  let isMavrykProfit = false;
  if (effectiveSupplyId) {
    const supRow = await db(TABLES.supplier)
      .select(COLS.SUPPLIER.SUPPLIER_NAME)
      .where(COLS.SUPPLIER.ID, effectiveSupplyId)
      .first();
    isMavrykProfit = isMavrykShopSupplierName(
      String(supRow?.[COLS.SUPPLIER.SUPPLIER_NAME] ?? "").trim()
    );
  }

  const variantPricing = await fetchVariantPricing(normalizedProductKey);
  if (!variantPricing?.variantId) {
    throw new PricingHttpError(400, "Không tìm thấy gói cho sản phẩm.");
  }

  let importBySource = 0;
  if (effectiveSupplyId && !isMavrykProfit) {
    const latestBySource = await db(TABLES.supplierCost)
      .select(COLS.SUPPLIER_COST.PRICE)
      .where(COLS.SUPPLIER_COST.VARIANT_ID, variantPricing.variantId)
      .andWhere(COLS.SUPPLIER_COST.SUPPLIER_ID, effectiveSupplyId)
      .orderBy(COLS.SUPPLIER_COST.ID, "desc")
      .first();

    if (latestBySource?.[COLS.SUPPLIER_COST.PRICE] !== undefined) {
      importBySource = normalizeMoney(
        latestBySource[COLS.SUPPLIER_COST.PRICE]
      );
    }
  }

  if (!isMavrykProfit && importBySource <= 0 && orderRow?.cost) {
    importBySource = normalizeMoney(orderRow.cost);
  }

  const maxPriceRow = await db(TABLES.supplierCost)
    .max(`${COLS.SUPPLIER_COST.PRICE} as maxPrice`)
    .where(COLS.SUPPLIER_COST.VARIANT_ID, variantPricing.variantId)
    .first();
  const maxSupplyPrice = normalizeMoney(maxPriceRow?.maxPrice || 0);

  if (maxSupplyPrice <= 0 && importBySource <= 0) {
    if (isMavrykProfit) {
      throw new PricingHttpError(
        400,
        "Chưa có giá tham chiếu (max NCC) cho gói. Thêm giá NCC cho variant hoặc nhập thủ công."
      );
    }
    throw new PricingHttpError(400, "Không có giá NCC");
  }

  const importPriceForFormula = isMavrykProfit
    ? 0
    : importBySource > 0
      ? importBySource
      : maxSupplyPrice;

  const pricingResult = calculateOrderPricingFromResolvedValues({
    orderId: normalizedOrderId,
    customerType,
    pricingBase: maxSupplyPrice > 0 ? maxSupplyPrice : importBySource,
    importPrice: importPriceForFormula,
    fallbackPrice: normalizeMoney(orderRow?.price),
    fallbackCost: isMavrykProfit ? 0 : normalizeMoney(orderRow?.cost),
    pctCtv: variantPricing.pctCtv,
    pctKhach: variantPricing.pctKhach,
    pctPromo: variantPricing.pctPromo,
    pctStu: variantPricing.pctStu,
    roundCostToThousands: !isMavrykProfit,
    days: 30,
    expiryDate: "",
  });

  if (isMavrykProfit) {
    return {
      ...pricingResult,
      cost: 0,
      totalPrice: pricingResult.price,
      gia_nhap: 0,
      mavryk_profit_mode: true,
    };
  }

  return pricingResult;
};

module.exports = {
  PricingHttpError,
  calculateOrderPricing,
  fetchVariantPricing,
};
