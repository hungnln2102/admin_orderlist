const { sumActiveShopBankBalances } = require("@/domains/shop-bank-accounts/repositories/shopBankBalanceRepository");

const toNumber = (value) => Number(value || 0);

/**
 * Lợi nhuận khả dụng = tổng số dư STK shop đang bật.
 * Cả tháng hiện tại lẫn tháng trước đều đọc cùng nguồn (sum STK).
 * Khi có hệ snapshot tháng cho STK, `previous` sẽ đọc từ snapshot để vẽ xu hướng;
 * trước khi có snapshot, trend % sẽ bằng 0 (không lệch nguồn sự thật).
 */
const fetchEstimatedBankBalancePair = async () => {
  const balance = toNumber(await sumActiveShopBankBalances());
  return {
    current: balance,
    previous: balance,
  };
};

module.exports = {
  fetchEstimatedBankBalancePair,
  fetchAvailableProfitPair: fetchEstimatedBankBalancePair,
};
