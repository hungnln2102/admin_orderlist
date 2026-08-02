const { SUFFIX_MAX } = require("@/domains/payment-slots/constants");

/** Giá đã cộng suffix thanh toán (base + 1..100). */
function hasPaymentSuffix(price, basePrice) {
  const p = Number(price);
  const base = Number(basePrice);
  if (!(base > 0) || !(p > 0)) return false;
  const delta = p - base;
  return delta >= 1 && delta <= SUFFIX_MAX && p === base + delta;
}

module.exports = {
  hasPaymentSuffix,
};
