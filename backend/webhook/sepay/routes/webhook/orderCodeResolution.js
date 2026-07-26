const { normalizeMoney } = require("../../utils");
const { isBatchCode } = require("./constants");

/**
 * Gom mã đơn xử lý webhook. Khi đã khớp theo `transaction`, không gộp thêm MAV lẻ
 * trong nội dung CK (tránh một biên lai 65k ghi DT/LN hai lần cho hai đơn).
 */
const buildWebhookLoopOrderCodes = ({
  batchOrderMap = new Map(),
}) => {
  return [...new Set([...batchOrderMap.values()].flat())];
};

/**
 * Phân bổ số tiền CK cho từng đơn trong vòng lặp.
 * Mặc định: một CK = một đơn nhận toàn bộ; nhiều đơn (legacy) chia đều.
 */
const createWebhookAmountForCodeResolver = ({
  batchCodes = [],
  batchOrderAmountMap = new Map(),
  loopOrderCodes = [],
  transferAmountNormalized = 0,
}) => {
  const multiOrder = loopOrderCodes.length > 1 && batchCodes.length === 0;
  const perOrderShare = multiOrder
    ? Math.round(normalizeMoney(transferAmountNormalized) / loopOrderCodes.length)
    : 0;

  return (code) => {
    if (batchCodes.length > 0) {
      return Math.max(0, normalizeMoney(batchOrderAmountMap.get(code) || 0));
    }
    if (!multiOrder) {
      return normalizeMoney(transferAmountNormalized);
    }
    return Math.max(0, perOrderShare);
  };
};

/**
 * Doanh thu ghi dashboard cho một biên lai — dùng phần incremental (recognizedRevenueCurrent),
 * cộng credit một lần khi biên lai đó đóng đủ phần thu qua ngân hàng.
 */
const resolveWebhookPostedRevenue = (amountDecision) => {
  if (!amountDecision?.complete) return 0;

  const current = normalizeMoney(amountDecision.recognizedRevenueCurrent);
  const credited = normalizeMoney(amountDecision.creditedAmount);
  const bankPayable = normalizeMoney(amountDecision.bankPayableForOrder);
  const priorBank = normalizeMoney(amountDecision.priorBankRevenueForOrder);

  if (credited > 0 && bankPayable > 0) {
    const bankClosed =
      normalizeMoney(priorBank + current) >= bankPayable;
    if (bankClosed) {
      const bankSlice = Math.min(current, Math.max(0, bankPayable - priorBank));
      return normalizeMoney(bankSlice + credited);
    }
  }

  return current;
};

module.exports = {
  buildWebhookLoopOrderCodes,
  createWebhookAmountForCodeResolver,
  resolveWebhookPostedRevenue,
};
