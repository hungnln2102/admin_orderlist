const db = require("../../../db/knexClient");
const {
  SHOP_BANK_ACCOUNTS_DEF,
  COLS,
  listShopBankAccounts,
  findShopBankAccountById,
  findDefaultActiveAccount,
  findShopBankAccountByNumberAndBankBin,
  clearDefaultFlags,
  insertShopBankAccount,
  updateShopBankAccount,
  deleteShopBankAccount,
} = require("../repositories/shopBankAccountRepository");
const {
  createHttpError,
  validateCreatePayload,
  validateUpdatePayload,
  validateDeletePayload,
  validateSetDefaultPayload,
} = require("../validators/shopBankAccountValidator");

const ensureDefinition = () => {
  if (!SHOP_BANK_ACCOUNTS_DEF) {
    throw createHttpError(
      500,
      "Thiếu cấu hình bảng shop_bank_accounts trong ADMIN_SCHEMA."
    );
  }
};

const toDbRow = (payload) => {
  const row = {};
  if (Object.prototype.hasOwnProperty.call(payload, "label")) {
    row[COLS.LABEL] = payload.label;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "accountNumber")) {
    row[COLS.ACCOUNT_NUMBER] = payload.accountNumber;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "accountHolder")) {
    row[COLS.ACCOUNT_HOLDER] = payload.accountHolder;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "bankBin")) {
    row[COLS.BANK_BIN] = payload.bankBin;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "bankShortCode")) {
    row[COLS.BANK_SHORT_CODE] = payload.bankShortCode;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "bankDisplayName")) {
    row[COLS.BANK_DISPLAY_NAME] = payload.bankDisplayName;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "qrNotePrefix")) {
    row[COLS.QR_NOTE_PREFIX] = payload.qrNotePrefix;
  }
  if (typeof payload.isActive === "boolean") {
    row[COLS.IS_ACTIVE] = payload.isActive;
  }
  if (typeof payload.isDefault === "boolean") {
    row[COLS.IS_DEFAULT] = payload.isDefault;
  }
  return row;
};

const listShopBankAccountItems = async () => {
  ensureDefinition();
  return listShopBankAccounts();
};

const getDefaultShopBankAccount = async () => {
  ensureDefinition();
  const row = await findDefaultActiveAccount();
  if (!row) {
    throw createHttpError(404, "Chưa có tài khoản mặc định đang bật.");
  }
  return row;
};

const createShopBankAccountItem = async (payload) => {
  ensureDefinition();
  const sanitized = validateCreatePayload(payload);

  const duplicate = await findShopBankAccountByNumberAndBankBin(
    sanitized.accountNumber,
    sanitized.bankBin
  );
  if (duplicate) {
    throw createHttpError(409, "So tai khoan da ton tai trong ngan hang nay.");
  }

  return db.transaction(async (trx) => {
    const shouldBeDefault = sanitized.isDefault;
    const list = await listShopBankAccounts();
    const noAccountsYet = list.length === 0;
    const makeDefault = shouldBeDefault || noAccountsYet;

    if (makeDefault) {
      await clearDefaultFlags(trx);
    }

    return insertShopBankAccount(trx, {
      ...toDbRow({ ...sanitized, isDefault: makeDefault, isActive: sanitized.isActive }),
    });
  });
};

const updateShopBankAccountItem = async (id, payload) => {
  ensureDefinition();
  const { id: normalizedId, updatePayload } = validateUpdatePayload(id, payload);

  const current = await findShopBankAccountById(normalizedId);
  if (!current) {
    throw createHttpError(404, "Không tìm thấy tài khoản.");
  }

  if (updatePayload.accountNumber || updatePayload.bankBin) {
    const nextAccountNumber = updatePayload.accountNumber ?? current.accountNumber;
    const nextBankBin = updatePayload.bankBin ?? current.bankBin;
    const duplicate = await findShopBankAccountByNumberAndBankBin(
      nextAccountNumber,
      nextBankBin
    );
    if (duplicate && Number(duplicate.id) !== normalizedId) {
      throw createHttpError(409, "So tai khoan da ton tai trong ngan hang nay.");
    }
  }

  return db.transaction(async (trx) => {
    if (updatePayload.isDefault === true) {
      await clearDefaultFlags(trx);
    }

    if (updatePayload.isDefault === false && current.isDefault) {
      const others = (await listShopBankAccounts()).filter(
        (row) => Number(row.id) !== normalizedId && row.isActive
      );
      if (others.length === 0) {
        throw createHttpError(
          400,
          "Không thể bỏ mặc định khi đây là tài khoản active duy nhất."
        );
      }
    }

    if (updatePayload.isActive === false && current.isDefault) {
      throw createHttpError(
        400,
        "Không thể tắt tài khoản đang là mặc định. Hãy chọn STK mặc định khác trước."
      );
    }

    return updateShopBankAccount(trx, normalizedId, toDbRow(updatePayload));
  });
};

const setDefaultShopBankAccountItem = async (id) => {
  ensureDefinition();
  const normalizedId = validateSetDefaultPayload(id);
  const current = await findShopBankAccountById(normalizedId);
  if (!current) {
    throw createHttpError(404, "Không tìm thấy tài khoản.");
  }
  if (!current.isActive) {
    throw createHttpError(400, "Chỉ có thể đặt mặc định cho tài khoản đang bật.");
  }

  return db.transaction(async (trx) => {
    await clearDefaultFlags(trx);
    return updateShopBankAccount(trx, normalizedId, {
      [COLS.IS_DEFAULT]: true,
    });
  });
};

const isForeignKeyViolation = (error) =>
  error?.code === "23503" ||
  /foreign key constraint/i.test(String(error?.message || ""));

const deleteShopBankAccountItem = async (id) => {
  ensureDefinition();
  const normalizedId = validateDeletePayload(id);
  const current = await findShopBankAccountById(normalizedId);
  if (!current) {
    throw createHttpError(404, "Không tìm thấy tài khoản.");
  }

  try {
    await deleteShopBankAccount(normalizedId);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw createHttpError(
        409,
        "Không thể xóa STK đã phát sinh giao dịch/sổ cái. Hãy tắt tài khoản thay vì xóa để giữ lịch sử đối soát."
      );
    }
    throw error;
  }

  if (current.isDefault) {
    const remaining = await listShopBankAccounts();
    const nextDefault = remaining.find((row) => row.isActive);
    if (nextDefault) {
      await db.transaction(async (trx) => {
        await clearDefaultFlags(trx);
        await updateShopBankAccount(trx, nextDefault.id, {
          [COLS.IS_DEFAULT]: true,
        });
      });
    }
  }

  return { success: true };
};

module.exports = {
  listShopBankAccountItems,
  getDefaultShopBankAccount,
  createShopBankAccountItem,
  updateShopBankAccountItem,
  setDefaultShopBankAccountItem,
  deleteShopBankAccountItem,
};
