const { db } = require("../../db");
const { ORDERS_SCHEMA } = require("../../config/dbSchema");
const { TABLES, COLS } = require("../../controllers/Order/constants");
const {
  calculateOrderPricingFromResolvedValues,
  normalizeMoney,
} = require("./core");

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
    .select(
      `${TABLES.variant}.${COLS.VARIANT.ID} as variant_id`,
      `${TABLES.variant}.${COLS.VARIANT.PCT_CTV} as pct_ctv`,
      `${TABLES.variant}.${COLS.VARIANT.PCT_KHACH} as pct_khach`,
      `${TABLES.variant}.${COLS.VARIANT.PCT_PROMO} as pct_promo`,
      `${TABLES.variant}.${COLS.VARIANT.PCT_STU} as pct_stu`
    )
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

  return {
    variantId: row.variant_id,
    pctCtv: row.pct_ctv,
    pctKhach: row.pct_khach,
    pctPromo: row.pct_promo,
    pctStu: row.pct_stu,
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

  const variantPricing = await fetchVariantPricing(normalizedProductKey);
  if (!variantPricing?.variantId) {
    throw new PricingHttpError(400, "Không tìm thấy gói cho sản phẩm.");
  }

  let importBySource = 0;
  if (effectiveSupplyId) {
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

  if (importBySource <= 0 && orderRow?.cost) {
    importBySource = normalizeMoney(orderRow.cost);
  }

  const maxPriceRow = await db(TABLES.supplierCost)
    .max(`${COLS.SUPPLIER_COST.PRICE} as maxPrice`)
    .where(COLS.SUPPLIER_COST.VARIANT_ID, variantPricing.variantId)
    .first();
  const maxSupplyPrice = normalizeMoney(maxPriceRow?.maxPrice || 0);

  if (maxSupplyPrice <= 0 && importBySource <= 0) {
    throw new PricingHttpError(400, "Không có giá NCC");
  }

  return calculateOrderPricingFromResolvedValues({
    orderId: normalizedOrderId,
    customerType,
    pricingBase: maxSupplyPrice > 0 ? maxSupplyPrice : importBySource,
    importPrice: importBySource > 0 ? importBySource : maxSupplyPrice,
    fallbackPrice: normalizeMoney(orderRow?.price),
    fallbackCost: normalizeMoney(orderRow?.cost),
    pctCtv: variantPricing.pctCtv,
    pctKhach: variantPricing.pctKhach,
    pctPromo: variantPricing.pctPromo,
    roundCostToThousands: true,
    days: 30,
    expiryDate: "",
  });
};

module.exports = {
  PricingHttpError,
  calculateOrderPricing,
  fetchVariantPricing,
};
