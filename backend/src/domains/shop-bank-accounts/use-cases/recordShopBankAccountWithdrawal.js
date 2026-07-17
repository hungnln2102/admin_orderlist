const db = require("@/db/knexClient");
const {
  SHOP_BANK_ACCOUNTS_DEF,
  findShopBankAccountById,
  TABLE,
  selectColumns,
  columns,
} = require("@/domains/shop-bank-accounts/repositories/shopBankAccountRepository");
const {
  debitShopBankWithdraw,
  SOURCE_KINDS,
} = require("@/domains/shop-bank-accounts/services/shopBankLedgerService");
const { createHttpError } = require("@/domains/shop-bank-accounts/validators/shopBankAccountValidator");
const { validateWithdrawPayload } = require("@/domains/shop-bank-accounts/validators/shopBankWithdrawnValidator");
const {
  normalizeOptionalText,
  normalizeRoundedMoney,
} = require("@/domains/shop-bank-accounts/helpers/shopBankInputs");
const {
  TABLE: EXPENSE_TABLE,
  COLS: EXPENSE_COLS,
} = require("@/domains/store-profit-expenses/controller/shared");


const recordShopBankAccountWithdrawal = async (id, payload) => {
  if (!SHOP_BANK_ACCOUNTS_DEF) {
    throw createHttpError(
      500,
      "Thiếu cấu hình bảng shop_bank_accounts trong ADMIN_SCHEMA."
    );
  }

  const { id: normalizedId, amount } = validateWithdrawPayload(id, payload);
  const reason = normalizeOptionalText(payload?.reason);
  const current = await findShopBankAccountById(normalizedId);
  if (!current) {
    throw createHttpError(404, "Không tìm thấy tài khoản.");
  }

  const result = await db.transaction(async (trx) => {
    const expensePayload = {
      [EXPENSE_COLS.AMOUNT]: amount,
      [EXPENSE_COLS.REASON]: reason,
      [EXPENSE_COLS.EXPENSE_TYPE]: "withdraw_profit",
      [EXPENSE_COLS.SHOP_BANK_ACCOUNT_ID]: normalizedId,
    };

    const [created] = await trx(EXPENSE_TABLE).insert(expensePayload).returning([EXPENSE_COLS.ID]);
    const expenseId = Number(created?.id ?? created?.[EXPENSE_COLS.ID] ?? 0);

    await debitShopBankWithdraw(trx, {
      accountId: normalizedId,
      amount,
      sourceKind: SOURCE_KINDS.STORE_PROFIT_EXPENSE,
      sourceId: expenseId,
      note: reason,
    });

    const updated = await trx(TABLE).select(selectColumns).where(columns.id, normalizedId).first();
    return { account: updated };
  });

  const account = result.account;
  return {
    ...account,
    totalReceived: normalizeRoundedMoney(account?.totalReceived),
    totalWithdrawn: normalizeRoundedMoney(account?.totalWithdrawn),
    balanceRemaining: normalizeRoundedMoney(account?.balance),
    withdrawnAmount: amount,
  };
};

module.exports = { recordShopBankAccountWithdrawal };
