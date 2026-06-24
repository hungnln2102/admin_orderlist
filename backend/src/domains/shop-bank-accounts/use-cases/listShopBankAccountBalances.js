const {
  listShopBankAccounts,
  SHOP_BANK_ACCOUNTS_DEF,
} = require("../repositories/shopBankAccountRepository");
const { createHttpError } = require("../validators/shopBankAccountValidator");
const { normalizeRoundedMoney } = require("../helpers/shopBankInputs");


const listShopBankAccountBalances = async () => {
  if (!SHOP_BANK_ACCOUNTS_DEF) {
    throw createHttpError(
      500,
      "Thiếu cấu hình bảng shop_bank_accounts trong ADMIN_SCHEMA."
    );
  }

  const accounts = await listShopBankAccounts();

  return (accounts || []).map((account) => {
    const totalReceived = normalizeRoundedMoney(account.totalReceived);
    const totalWithdrawn = normalizeRoundedMoney(account.totalWithdrawn);
    const balanceRemaining = normalizeRoundedMoney(account.balance);

    return {
      ...account,
      totalReceived,
      totalWithdrawn,
      balanceRemaining,
    };
  });
};

module.exports = { listShopBankAccountBalances };
