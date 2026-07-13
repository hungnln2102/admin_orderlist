const {
  calculateOrderPricingFromResolvedValues,
  deriveVariantMarginsFromCostAndSalePrice,
  resolveTierPrice,
} = require("../../../src/services/pricing/core");

describe("pricing core baseline calculations", () => {
  const prefixMap = {
    ctv: "MAVC",
    customer: "MAVL",
    promo: "MAVK",
    gift: "MAVT",
    import: "MAVN",
    student: "MAVS",
  };

  test("calculates legacy prefix prices from resolved values", () => {
    const common = {
      pricingBase: 100000,
      importPrice: 80000,
      pctCtv: 0.2,
      pctKhach: 0.2,
      pctPromo: 0.1,
      pctStu: 0.1,
      _prefixMap: prefixMap,
    };

    expect(
      calculateOrderPricingFromResolvedValues({
        ...common,
        orderId: "MAVC001",
      })
    ).toMatchObject({
      cost: 80000,
      price: 125000,
      resellPrice: 125000,
      customerPrice: 156000,
      promo: 16000,
      promoPrice: 140000,
    });

    expect(
      calculateOrderPricingFromResolvedValues({
        ...common,
        orderId: "MAVL001",
      }).price
    ).toBe(156000);

    expect(
      calculateOrderPricingFromResolvedValues({
        ...common,
        orderId: "MAVK001",
      }).price
    ).toBe(141000);

    expect(
      calculateOrderPricingFromResolvedValues({
        ...common,
        orderId: "MAVS001",
      }).price
    ).toBe(139000);

    expect(
      calculateOrderPricingFromResolvedValues({
        ...common,
        orderId: "MAVT001",
      }).price
    ).toBe(0);

    expect(
      calculateOrderPricingFromResolvedValues({
        ...common,
        orderId: "MAVN001",
      }).price
    ).toBe(80000);
  });

  test("resolves recursive tier prices with markup, discount, cost, and zero rules", () => {
    const tiersByKey = {
      ctv: { key: "ctv", pricing_rule: "markup" },
      customer: { key: "customer", pricing_rule: "markup", base_tier_key: "ctv" },
      promo: { key: "promo", pricing_rule: "discount", base_tier_key: "customer" },
      import: { key: "import", pricing_rule: "cost" },
      gift: { key: "gift", pricing_rule: "fixed_zero" },
    };
    const marginsByKey = { ctv: 0.2, customer: 0.2, promo: 0.1 };
    const cache = {};

    expect(
      resolveTierPrice(tiersByKey.customer, tiersByKey, marginsByKey, 100000, cache, 80000)
    ).toBe(156250);
    expect(resolveTierPrice(tiersByKey.promo, tiersByKey, marginsByKey, 100000, cache, 80000)).toBe(
      140625
    );
    expect(
      resolveTierPrice(tiersByKey.import, tiersByKey, marginsByKey, 100000, cache, 80000)
    ).toBe(80000);
    expect(resolveTierPrice(tiersByKey.gift, tiersByKey, marginsByKey, 100000, cache, 80000)).toBe(
      0
    );
  });

  test("derives variant margins from sale price by order prefix", () => {
    const previousDefault = process.env.NEW_VARIANT_DEFAULT_PCT_CTV;
    process.env.NEW_VARIANT_DEFAULT_PCT_CTV = "0.04";

    try {
      expect(
        deriveVariantMarginsFromCostAndSalePrice({
          cost: 100000,
          salePrice: 125000,
          orderPrefix: "MAVC",
          _prefixMap: { ctv: "MAVC", customer: "MAVL" },
        })
      ).toEqual({ pctCtv: 0.19999999999999996, pctKhach: 0 });

      const customerMargins = deriveVariantMarginsFromCostAndSalePrice({
        cost: 100000,
        salePrice: 130000,
        orderPrefix: "MAVL",
        _prefixMap: { ctv: "MAVC", customer: "MAVL" },
      });

      expect(customerMargins.pctCtv).toBe(0.04);
      expect(customerMargins.pctKhach).toBeCloseTo(0.1987179487, 10);
    } finally {
      if (previousDefault === undefined) {
        delete process.env.NEW_VARIANT_DEFAULT_PCT_CTV;
      } else {
        process.env.NEW_VARIANT_DEFAULT_PCT_CTV = previousDefault;
      }
    }
  });
});
