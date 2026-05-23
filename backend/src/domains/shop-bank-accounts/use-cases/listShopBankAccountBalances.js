const {
  listShopBankAccounts,
  SHOP_BANK_ACCOUNTS_DEF,
} = require("../repositories/shopBankAccountRepository");
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

  const accounts = await listShopBankAccounts();

  return (accounts || []).map((account) => {
    const totalReceived = toMoney(account.totalReceived);
    const totalWithdrawn = toMoney(account.totalWithdrawn);
    const balanceRemaining = toMoney(account.balance);

    return {
      ...account,
      totalReceived,
      totalWithdrawn,
      balanceRemaining,
    };
  });
};

module.exports = { listShopBankAccountBalances };
