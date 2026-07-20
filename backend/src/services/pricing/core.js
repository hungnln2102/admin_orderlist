const { roundGiaBanValue } = require("@/utils/orderHelpers");
const { getTiers } = require("@/services/pricing/tierCache");

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
  Math.max(0, roundGiaBanValue(value));

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



module.exports = {
  normalizeMoney,
  normalizeImportValue,
  resolveMoney,
  normalizeRatio: normalizeMarginRatio,
  normalizeMarginRatio,
  normalizePromoRatio,
  calculateMarginBasedPrice,
  resolveOrderKind,
  resolveOrderKindSync,
  resolveTierPrice,
};
