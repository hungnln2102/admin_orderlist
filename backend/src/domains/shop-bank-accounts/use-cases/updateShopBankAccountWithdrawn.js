const db = require("../../../db/knexClient");
const {
  SHOP_BANK_ACCOUNTS_DEF,
  COLS,
  findShopBankAccountById,
  updateShopBankAccount,
} = require("../repositories/shopBankAccountRepository");
const { sumReceivedByReceiver } = require("../repositories/shopBankReceiptTotalsRepository");
const {
  normalizeAccountNumber,
  normalizeRoundedMoney,
} = require("../helpers/shopBankInputs");
const { createHttpError } = require("../validators/shopBankAccountValidator");
const { validateWithdrawnPayload } = require("../validators/shopBankWithdrawnValidator");


const updateShopBankAccountWithdrawn = async (id, payload) => {
  if (!SHOP_BANK_ACCOUNTS_DEF) {
    throw createHttpError(
      500,
      "Thiếu cấu hình bảng shop_bank_accounts trong ADMIN_SCHEMA."
    );
  }

  const { id: normalizedId, totalWithdrawn } = validateWithdrawnPayload(id, payload);
  const current = await findShopBankAccountById(normalizedId);
  if (!current) {
    throw createHttpError(404, "Không tìm thấy tài khoản.");
  }

  const updated = await db.transaction(async (trx) =>
    updateShopBankAccount(trx, normalizedId, {
      [COLS.TOTAL_WITHDRAWN]: totalWithdrawn,
    })
  );

  const receivedByStk = await sumReceivedByReceiver();
  const stkKey = normalizeAccountNumber(updated.accountNumber);
  const totalReceived = normalizeRoundedMoney(receivedByStk.get(stkKey) || 0);
  const totalWithdrawnOut = normalizeRoundedMoney(updated.totalWithdrawn);

  return {
    ...updated,
    totalReceived,
    totalWithdrawn: totalWithdrawnOut,
    balanceRemaining: totalReceived - totalWithdrawnOut,
  };
};

module.exports = { updateShopBankAccountWithdrawn };
