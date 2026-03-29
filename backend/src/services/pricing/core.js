const { ORDER_PREFIXES, roundGiaBanValue } = require("../../utils/orderHelpers");

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

const resolveOrderKind = ({ orderId, customerType }) => {
  const normalizedOrderId = String(orderId || "").trim().toUpperCase();
  const normalizedCustomerType = String(customerType || "")
    .trim()
    .toUpperCase();
  const matchPrefix = (prefix) =>
    Boolean(prefix) &&
    (normalizedOrderId.startsWith(prefix) || normalizedCustomerType === prefix);

  return {
    isCtv: matchPrefix((ORDER_PREFIXES?.ctv || "MAVC").toUpperCase()),
    isLe: matchPrefix((ORDER_PREFIXES?.le || "MAVL").toUpperCase()),
    isKhuyen: matchPrefix((ORDER_PREFIXES?.khuyen || "MAVK").toUpperCase()),
    isTang: matchPrefix((ORDER_PREFIXES?.tang || "MAVT").toUpperCase()),
    isNhap: matchPrefix((ORDER_PREFIXES?.nhap || "MAVN").toUpperCase()),
    isSinhVien: matchPrefix((ORDER_PREFIXES?.sinhvien || "MAVS").toUpperCase()),
  };
};

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
  forceKhachLe = false,
  roundCostToThousands = false,
  days = 30,
  expiryDate = "",
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

  const orderKind = resolveOrderKind({ orderId, customerType });
  let price = customerPrice;

  if (forceKhachLe) {
    price = customerPrice;
  } else if (orderKind.isCtv || orderKind.isSinhVien) {
    price = resellPrice;
  } else if (orderKind.isLe) {
    price = customerPrice;
  } else if (orderKind.isKhuyen) {
    const factor = Math.max(0, 1 - pctPromoNormalized);
    price = roundPricingValue(customerRaw * factor);
  } else if (orderKind.isTang) {
    price = 0;
  } else if (orderKind.isNhap) {
    price = baseCost;
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
      pctPromo: pctPromoNormalized,
      orderKind,
      forceKhachLe,
    },
  };
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
};
