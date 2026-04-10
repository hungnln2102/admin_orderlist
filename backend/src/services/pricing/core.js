const { roundGiaBanValue } = require("../../utils/orderHelpers");
const { getTiers, getPrefixMap } = require("./tierCache");

const normalizeMoney = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  const text = String(value ?? "").trim();
  if (!text) return 0;

  const normalized = text.replace(/,/g, "").replace(/\s+/g, "");
  const asNumber = Number.parseFloat(normalized);
  if (Number.isFinite(asNumber)) {
    return Math.round(asNumber);
  }

  const digits = normalized.replace(/[^\d-]/g, "");
  const numeric = Number.parseInt(digits || "0", 10);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeImportValue = (value, ...referenceValues) => {
  const numeric = normalizeMoney(value);
  const references = referenceValues
    .map((ref) => normalizeMoney(ref))
    .filter((ref) => Number.isFinite(ref) && ref > 0);

  for (const reference of references) {
    const ratio = numeric / reference;
    const shouldScaleDown = ratio >= 40 && ratio <= 150 && numeric % 100 === 0;
    if (shouldScaleDown) {
      return {
        value: Math.round(numeric / 100),
        scaled: true,
        reference,
      };
    }
  }

  return { value: numeric, scaled: false, reference: null };
};

const roundToThousands = (value) => {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric === 0) return 0;
  const remainder = numeric % 1000;
  if (remainder === 0) return numeric;
  return remainder >= 500 ? numeric + (1000 - remainder) : numeric - remainder;
};

const resolveMoney = (computedValue, ...fallbackValues) => {
  if (Number.isFinite(computedValue) && computedValue > 0) {
    return Math.round(computedValue);
  }

  for (const candidate of fallbackValues) {
    if (candidate === null || candidate === undefined) continue;
    const normalized = normalizeMoney(candidate);
    if (Number.isFinite(normalized) && normalized > 0) {
      return normalized;
    }
  }

  const lastDefined = fallbackValues.find(
    (candidate) => candidate !== null && candidate !== undefined
  );
  return lastDefined !== undefined ? normalizeMoney(lastDefined) : 0;
};

const clampOpenRatio = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(0.9999, Math.max(0, value));
};

const normalizeMarginRatio = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return clampOpenRatio(fallback);
  }
  if (numeric === 0) {
    return 0;
  }
  if (numeric >= 1) {
    return clampOpenRatio(fallback);
  }
  return clampOpenRatio(numeric);
};

const normalizePromoRatio = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return clampOpenRatio(numeric > 1 ? numeric / 100 : numeric);
};

const roundPricingValue = (value) =>
  Math.max(0, roundToThousands(roundGiaBanValue(value)));

const calculateMarginBasedPrice = (basePrice, marginRatio) => {
  const numericBase = Number(basePrice);
  if (!Number.isFinite(numericBase) || numericBase <= 0) {
    return 0;
  }

  const normalizedMargin = clampOpenRatio(marginRatio);
  const denominator = Math.max(0.0001, 1 - normalizedMargin);
  return numericBase / denominator;
};

/* ------------------------------------------------------------------ */
/*  resolveOrderKind — async, đọc tiers từ cache/DB                   */
/* ------------------------------------------------------------------ */

const resolveOrderKind = async ({ orderId, customerType }) => {
  const normalizedOrderId = String(orderId || "").trim().toUpperCase();
  const normalizedCustomerType = String(customerType || "").trim().toUpperCase();

  const matchPrefix = (prefix) =>
    Boolean(prefix) &&
    (normalizedOrderId.startsWith(prefix) || normalizedCustomerType === prefix);

  const tiers = await getTiers();
  const result = { matchedTier: null };

  for (const tier of tiers) {
    const flag = `is${tier.key.charAt(0).toUpperCase()}${tier.key.slice(1)}`;
    const matched = matchPrefix(tier.prefix.toUpperCase());
    result[flag] = matched;
    if (matched && !result.matchedTier) {
      result.matchedTier = tier;
    }
  }

  return result;
};

/**
 * Synchronous fallback — dùng khi caller chưa migrate sang async.
 * Đọc từ prefixMap (đã await sẵn) hoặc hardcode.
 */
const resolveOrderKindSync = (prefixMap, { orderId, customerType }) => {
  const normalizedOrderId = String(orderId || "").trim().toUpperCase();
  const normalizedCustomerType = String(customerType || "").trim().toUpperCase();

  const matchPrefix = (prefix) =>
    Boolean(prefix) &&
    (normalizedOrderId.startsWith(prefix) || normalizedCustomerType === prefix);

  return {
    isCtv: matchPrefix((prefixMap?.ctv || "MAVC").toUpperCase()),
    isCustomer: matchPrefix((prefixMap?.customer || "MAVL").toUpperCase()),
    isPromo: matchPrefix((prefixMap?.promo || "MAVK").toUpperCase()),
    isGift: matchPrefix((prefixMap?.gift || "MAVT").toUpperCase()),
    isImport: matchPrefix((prefixMap?.import || "MAVN").toUpperCase()),
    isStudent: matchPrefix((prefixMap?.student || "MAVS").toUpperCase()),
  };
};

/* ------------------------------------------------------------------ */
/*  Generic tier-chain pricing                                         */
/* ------------------------------------------------------------------ */

/**
 * Tính giá cho 1 tier dựa trên pricing_rule và chuỗi base_tier_key.
 * @param {Object} params
 * @param {Object} tier           - tier object từ pricing_tier
 * @param {Object} tiersByKey     - { key: tier } lookup map
 * @param {Object} marginsByKey   - { tierKey: marginRatio } cho variant này
 * @param {number} baseCost       - giá nhập / base_price
 * @param {Object} priceCache     - { tierKey: rawPrice } memo
 */
/**
 * @param {number} pricingBase   - giá gốc (base_price) cho chuỗi markup
 * @param {number} importCost    - giá nhập thực tế cho pricing_rule "cost"
 */
const resolveTierPrice = (tier, tiersByKey, marginsByKey, pricingBase, priceCache, importCost) => {
  if (priceCache[tier.key] !== undefined) return priceCache[tier.key];

  if (tier.pricing_rule === "fixed_zero") {
    priceCache[tier.key] = 0;
    return 0;
  }
  if (tier.pricing_rule === "cost") {
    const cost = importCost !== undefined ? importCost : pricingBase;
    priceCache[tier.key] = cost;
    return cost;
  }

  let basePrice = pricingBase;
  if (tier.base_tier_key && tiersByKey[tier.base_tier_key]) {
    basePrice = resolveTierPrice(
      tiersByKey[tier.base_tier_key],
      tiersByKey,
      marginsByKey,
      pricingBase,
      priceCache,
      importCost
    );
  }

  const margin = marginsByKey[tier.key] || 0;

  if (tier.pricing_rule === "markup") {
    const price = margin > 0 && margin < 1
      ? calculateMarginBasedPrice(basePrice, margin)
      : basePrice;
    priceCache[tier.key] = price;
    return price;
  }

  if (tier.pricing_rule === "discount") {
    const normalizedDiscount = normalizePromoRatio(margin);
    const factor = Math.max(0, 1 - normalizedDiscount);
    const price = basePrice * factor;
    priceCache[tier.key] = price;
    return price;
  }

  priceCache[tier.key] = basePrice;
  return basePrice;
};

/* ------------------------------------------------------------------ */
/*  calculateOrderPricingFromResolvedValues — backward compat          */
/* ------------------------------------------------------------------ */

const calculateOrderPricingFromResolvedValues = ({
  orderId = "",
  customerType = "",
  pricingBase,
  importPrice,
  fallbackPrice = 0,
  fallbackCost = 0,
  pctCtv,
  pctKhach,
  pctPromo,
  pctStu,
  forceKhachLe = false,
  roundCostToThousands = false,
  days = 30,
  expiryDate = "",
  /** Nếu caller đã await getPrefixMap() sẵn, truyền vào để tránh gọi lại. */
  _prefixMap = null,
  /** Nếu caller đã await getTiers() sẵn, truyền vào. */
  _tiers = null,
} = {}) => {
  const normalizedPricingBase = resolveMoney(
    pricingBase,
    importPrice,
    fallbackPrice,
    fallbackCost
  );
  const normalizedImportPrice = resolveMoney(
    importPrice,
    fallbackCost,
    normalizedPricingBase
  );

  const pctCtvNormalized = normalizeMarginRatio(pctCtv, 0);
  const pctKhachNormalized = normalizeMarginRatio(pctKhach, 0);
  const pctPromoNormalized = normalizePromoRatio(pctPromo);

  const resellRaw = calculateMarginBasedPrice(
    normalizedPricingBase,
    pctCtvNormalized
  );
  const customerRaw = calculateMarginBasedPrice(resellRaw, pctKhachNormalized);
  const pctStuProvided =
    pctStu !== null &&
    pctStu !== undefined &&
    !(typeof pctStu === "string" && String(pctStu).trim() === "");
  const pctStuNormalized = pctStuProvided
    ? normalizeMarginRatio(pctStu, 0)
    : pctKhachNormalized;
  const studentRaw = calculateMarginBasedPrice(resellRaw, pctStuNormalized);
  const resellPrice = roundPricingValue(resellRaw);
  const customerPrice = roundPricingValue(customerRaw);
  const baseCost = roundCostToThousands
    ? roundPricingValue(normalizedImportPrice)
    : resolveMoney(normalizedImportPrice, fallbackCost, normalizedPricingBase);

  const promoAmount =
    pctPromoNormalized > 0
      ? roundPricingValue(customerPrice * pctPromoNormalized)
      : 0;
  const promoPrice = Math.max(0, customerPrice - promoAmount);

  const studentPrice = roundPricingValue(studentRaw);

  /* --- Generic tier-based price resolution --- */
  let price = customerPrice;

  if (_tiers && _tiers.length > 0) {
    const tiersByKey = {};
    for (const t of _tiers) tiersByKey[t.key] = t;

    const marginsByKey = {
      ctv: pctCtvNormalized,
      customer: pctKhachNormalized,
      promo: pctPromoNormalized,
      student: pctStuNormalized,
    };

    const prefixMap = _prefixMap || {};
    const orderKindSync = resolveOrderKindSync(prefixMap, { orderId, customerType });

    if (forceKhachLe) {
      price = customerPrice;
    } else {
      const matchedTier = _tiers.find((t) => {
        const upper = t.prefix.toUpperCase();
        const oid = String(orderId || "").trim().toUpperCase();
        const ct = String(customerType || "").trim().toUpperCase();
        return oid.startsWith(upper) || ct === upper;
      });

      if (matchedTier) {
        const priceCache = {};
        const rawPrice = resolveTierPrice(
          matchedTier,
          tiersByKey,
          marginsByKey,
          normalizedPricingBase,
          priceCache,
          baseCost
        );
        price = roundPricingValue(rawPrice);
      }
    }
  } else {
    const prefixMap = _prefixMap || {
      ctv: "MAVC", customer: "MAVL", promo: "MAVK",
      gift: "MAVT", import: "MAVN", student: "MAVS",
    };
    const orderKind = resolveOrderKindSync(prefixMap, { orderId, customerType });

    if (forceKhachLe) {
      price = customerPrice;
    } else if (orderKind.isStudent) {
      price = studentPrice;
    } else if (orderKind.isCtv) {
      price = resellPrice;
    } else if (orderKind.isCustomer) {
      price = customerPrice;
    } else if (orderKind.isPromo) {
      const factor = Math.max(0, 1 - pctPromoNormalized);
      price = roundPricingValue(customerRaw * factor);
    } else if (orderKind.isGift) {
      price = 0;
    } else if (orderKind.isImport) {
      price = baseCost;
    }
  }

  return {
    cost: baseCost,
    price,
    promoPrice,
    pricePromo: promoPrice,
    promo: promoAmount,
    resellPrice,
    customerPrice,
    totalPrice: price,
    days,
    expiry_date: expiryDate,
    meta: {
      pricingBase: normalizedPricingBase,
      importPrice: normalizedImportPrice,
      pctCtv: pctCtvNormalized,
      pctKhach: pctKhachNormalized,
      pctStu: pctStuNormalized,
      pctPromo: pctPromoNormalized,
      studentPrice,
      forceKhachLe,
    },
  };
};

const deriveVariantMarginsFromCostAndSalePrice = ({
  cost,
  salePrice,
  orderPrefix,
  customerType,
  _prefixMap = null,
} = {}) => {
  const B = normalizeMoney(cost);
  const P = normalizeMoney(salePrice);
  const head = String(orderPrefix || customerType || "")
    .trim()
    .toUpperCase()
    .slice(0, 4);

  const prefixMap = _prefixMap || {
    ctv: "MAVC", customer: "MAVL",
  };
  const isMavl = head === (prefixMap.customer || "MAVL");
  const isMavc = head === (prefixMap.ctv || "MAVC");

  if (!Number.isFinite(B) || B <= 0 || !Number.isFinite(P) || P <= 0) {
    return { pctCtv: 0, pctKhach: 0 };
  }

  const defaultCtvFromEnv = Number(process.env.NEW_VARIANT_DEFAULT_PCT_CTV);
  const defaultCtv = normalizeMarginRatio(
    Number.isFinite(defaultCtvFromEnv) ? defaultCtvFromEnv : 0.04,
    0.04
  );

  if (isMavl) {
    const resellRaw = calculateMarginBasedPrice(B, defaultCtv);
    if (P > resellRaw * 0.999) {
      const pctKhach = normalizeMarginRatio(1 - resellRaw / P, 0);
      return { pctCtv: defaultCtv, pctKhach };
    }
    const pctCtv = normalizeMarginRatio(1 - B / P, 0);
    return { pctCtv, pctKhach: 0 };
  }

  if (isMavc) {
    const pctCtv = normalizeMarginRatio(1 - B / P, 0);
    return { pctCtv, pctKhach: 0 };
  }

  const pctCtv = normalizeMarginRatio(1 - B / P, 0);
  return { pctCtv, pctKhach: 0 };
};

module.exports = {
  normalizeMoney,
  normalizeImportValue,
  roundToThousands,
  resolveMoney,
  normalizeRatio: normalizeMarginRatio,
  normalizeMarginRatio,
  normalizePromoRatio,
  calculateMarginBasedPrice,
  calculateOrderPricingFromResolvedValues,
  deriveVariantMarginsFromCostAndSalePrice,
  resolveOrderKind,
  resolveOrderKindSync,
  resolveTierPrice,
};
