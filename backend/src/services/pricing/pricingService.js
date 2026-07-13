const {
  PricingHttpError,
  calculateOrderPricing,
  fetchVariantPricing,
} = require("./orderPricingService");
const {
  calculateOrderPricingFromResolvedValues,
  deriveVariantMarginsFromCostAndSalePrice,
  resolveTierPrice,
  roundToThousands,
} = require("./core");

const toPricingNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const mapPublicVariantPricingResult = (variantId, row = {}) => {
  if (!row) return null;

  const pricingBase = toPricingNumber(row.max_supply_price ?? row.maxSupplyPrice);
  const ctvPrice = toPricingNumber(row.ctv_price ?? row.ctvPrice);
  const retailPrice = toPricingNumber(row.customer_price ?? row.customerPrice ?? row.retailPrice);
  const promoPrice = toPricingNumber(row.promo_price ?? row.promoPrice);
  const studentPrice = toPricingNumber(row.student_price ?? row.studentPrice);
  const importPrice = toPricingNumber(row.import_price ?? row.importPrice);
  const cost = importPrice > 0 ? importPrice : pricingBase;

  return {
    variantId,
    ctvPrice: ctvPrice > 0 ? ctvPrice : retailPrice,
    retailPrice,
    promoPrice: promoPrice > 0 ? promoPrice : retailPrice,
    studentPrice: studentPrice > 0 ? studentPrice : retailPrice,
    cost,
    costRounded: Math.max(0, roundToThousands(Math.round(pricingBase))),
  };
};

module.exports = {
  PricingHttpError,
  calculateOrderPricing,
  calculateOrderPricingFromResolvedValues,
  deriveVariantMarginsFromCostAndSalePrice,
  fetchVariantPricing,
  mapPublicVariantPricingResult,
  resolveTierPrice,
};
