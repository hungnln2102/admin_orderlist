const {
  listShopBankAccounts,
  SHOP_BANK_ACCOUNTS_DEF,
} = require("../repositories/shopBankAccountRepository");
const {
  normalizeAccountNumber,
  sumReceivedByReceiver,
} = require("../repositories/shopBankReceiptTotalsRepository");
const { createHttpError } = require("../validators/shopBankAccountValidator");

const toMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
};

const listShopBankAccountBalances = async () => {
  if (!SHOP_BANK_ACCOUNTS_DEF) {
    throw createHttpError(
      500,
      "Thiếu cấu hình bảng shop_bank_accounts trong ADMIN_SCHEMA."
    );
  }

  const [accounts, receivedByStk] = await Promise.all([
    listShopBankAccounts(),
    sumReceivedByReceiver(),
  ]);

  return (accounts || []).map((account) => {
    const stkKey = normalizeAccountNumber(account.accountNumber);
    const totalReceived = toMoney(receivedByStk.get(stkKey) || 0);
    const totalWithdrawn = toMoney(account.totalWithdrawn);
    const balanceRemaining = totalReceived - totalWithdrawn;

    return {
      ...account,
      totalReceived,
      totalWithdrawn,
      balanceRemaining,
    };
  });
};

module.exports = { listShopBankAccountBalances };
