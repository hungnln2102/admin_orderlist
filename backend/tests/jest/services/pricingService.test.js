const pricingService = require("../../../src/services/pricing/pricingService");
const orderPricingService = require("../../../src/services/pricing/orderPricingService");
const pricingCore = require("../../../src/services/pricing/core");

describe("pricingService facade", () => {
  test("exports the stable pricing owner surface", () => {
    expect(pricingService.PricingHttpError).toBe(orderPricingService.PricingHttpError);
    expect(pricingService.calculateOrderPricing).toBe(orderPricingService.calculateOrderPricing);
    expect(pricingService.fetchVariantPricing).toBe(orderPricingService.fetchVariantPricing);
    expect(pricingService.calculateOrderPricingFromResolvedValues).toBe(
      pricingCore.calculateOrderPricingFromResolvedValues
    );
    expect(pricingService.deriveVariantMarginsFromCostAndSalePrice).toBe(
      pricingCore.deriveVariantMarginsFromCostAndSalePrice
    );
    expect(pricingService.resolveTierPrice).toBe(pricingCore.resolveTierPrice);
    expect(typeof pricingService.mapPublicVariantPricingResult).toBe("function");
  });
});

test("maps public variant pricing rows through the pricing owner facade", () => {
  expect(
    pricingService.mapPublicVariantPricingResult(12, {
      max_supply_price: 100400,
      ctv_price: 110000,
      customer_price: 150000,
      promo_price: 140000,
      student_price: 130000,
      import_price: 90000,
    })
  ).toEqual({
    variantId: 12,
    ctvPrice: 110000,
    retailPrice: 150000,
    promoPrice: 140000,
    studentPrice: 130000,
    cost: 90000,
    costRounded: 100000,
  });

  expect(
    pricingService.mapPublicVariantPricingResult(13, {
      max_supply_price: 100600,
      customer_price: 150000,
    })
  ).toEqual({
    variantId: 13,
    ctvPrice: 150000,
    retailPrice: 150000,
    promoPrice: 150000,
    studentPrice: 150000,
    cost: 100600,
    costRounded: 101000,
  });
});
