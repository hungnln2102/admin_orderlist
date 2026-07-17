const { roundGiaBanValue } = require("@/utils/orderHelpers");

/**
 * Suy ra giá gốc (trước suffix) cho đơn Chưa TT khi backfill slot.
 * Đơn cũ thường lưu giá tròn (65.000); nếu đã lỡ ghi số có suffix mà chưa có row slot thì tách phần 1..100.
 */
function deriveUnpaidBaseAmount(storedPrice) {
  const rounded = roundGiaBanValue(storedPrice);
  if (!(rounded > 0)) return 0;

  const suffixPart = rounded % 100;
  if (suffixPart >= 1 && suffixPart <= 100 && rounded > suffixPart) {
    const possibleBase = rounded - suffixPart;
    if (possibleBase >= 1000 && possibleBase % 1000 === 0) {
      return possibleBase;
    }
  }

  return rounded;
}

module.exports = { deriveUnpaidBaseAmount };
