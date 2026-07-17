const db = require("@/db/knexClient");
const {
  USDT_WALLETS_DEF,
  COLS,
  listUsdtWallets,
  findUsdtWalletById,
  findUsdtWalletByAddress,
  clearDefaultFlags,
  insertUsdtWallet,
  updateUsdtWallet,
  deleteUsdtWallet,
} = require("@/domains/usdt-wallets/repositories/usdtWalletRepository");
const {
  createHttpError,
  validateCreatePayload,
  validateUpdatePayload,
  validateDeletePayload,
  validateSetDefaultPayload,
} = require("@/domains/usdt-wallets/validators/usdtWalletValidator");

const ensureDefinition = () => {
  if (!USDT_WALLETS_DEF) {
    throw createHttpError(
      500,
      "Thiếu cấu hình bảng usdt_wallets trong ADMIN_SCHEMA."
    );
  }
};

const toDbRow = (payload) => {
  const row = {};
  if (Object.prototype.hasOwnProperty.call(payload, "label")) {
    row[COLS.LABEL] = payload.label;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "walletAddress")) {
    row[COLS.WALLET_ADDRESS] = payload.walletAddress;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "network")) {
    row[COLS.NETWORK] = payload.network;
  }
  if (typeof payload.isActive === "boolean") {
    row[COLS.IS_ACTIVE] = payload.isActive;
  }
  if (typeof payload.isDefault === "boolean") {
    row[COLS.IS_DEFAULT] = payload.isDefault;
  }
  return row;
};

const listUsdtWalletItems = async () => {
  ensureDefinition();
  return listUsdtWallets();
};

const getDefaultUsdtWallet = async () => {
  ensureDefinition();
  const { findDefaultActiveUsdtWallet } = require("@/domains/usdt-wallets/repositories/usdtWalletRepository");
  const row = await findDefaultActiveUsdtWallet();
  if (!row) {
    throw createHttpError(404, "Chưa có ví USDT mặc định đang bật.");
  }
  return row;
};

const createUsdtWalletItem = async (payload) => {
  ensureDefinition();
  const sanitized = validateCreatePayload(payload);

  const duplicate = await findUsdtWalletByAddress(sanitized.walletAddress);
  if (duplicate) {
    throw createHttpError(409, "Địa chỉ ví đã tồn tại.");
  }

  return db.transaction(async (trx) => {
    const list = await listUsdtWallets();
    const noWalletsYet = list.length === 0;
    const makeDefault = sanitized.isDefault || noWalletsYet;

    if (makeDefault) {
      await clearDefaultFlags(trx);
    }

    return insertUsdtWallet(trx, {
      ...toDbRow({ ...sanitized, isDefault: makeDefault, isActive: sanitized.isActive }),
    });
  });
};

const updateUsdtWalletItem = async (id, payload) => {
  ensureDefinition();
  const { id: normalizedId, updatePayload } = validateUpdatePayload(id, payload);

  const current = await findUsdtWalletById(normalizedId);
  if (!current) {
    throw createHttpError(404, "Không tìm thấy ví.");
  }

  if (updatePayload.walletAddress) {
    const duplicate = await findUsdtWalletByAddress(updatePayload.walletAddress);
    if (duplicate && Number(duplicate.id) !== normalizedId) {
      throw createHttpError(409, "Địa chỉ ví đã tồn tại.");
    }
  }

  return db.transaction(async (trx) => {
    if (updatePayload.isDefault === true) {
      await clearDefaultFlags(trx);
    }

    if (updatePayload.isDefault === false && current.isDefault) {
      const others = (await listUsdtWallets()).filter(
        (row) => Number(row.id) !== normalizedId && row.isActive
      );
      if (others.length === 0) {
        throw createHttpError(
          400,
          "Không thể bỏ mặc định khi đây là ví active duy nhất."
        );
      }
    }

    if (updatePayload.isActive === false && current.isDefault) {
      throw createHttpError(
        400,
        "Không thể tắt ví đang là mặc định. Hãy chọn ví mặc định khác trước."
      );
    }

    return updateUsdtWallet(trx, normalizedId, toDbRow(updatePayload));
  });
};

const setDefaultUsdtWalletItem = async (id) => {
  ensureDefinition();
  const normalizedId = validateSetDefaultPayload(id);
  const current = await findUsdtWalletById(normalizedId);
  if (!current) {
    throw createHttpError(404, "Không tìm thấy ví.");
  }
  if (!current.isActive) {
    throw createHttpError(400, "Chỉ có thể đặt mặc định cho ví đang bật.");
  }

  return db.transaction(async (trx) => {
    await clearDefaultFlags(trx);
    return updateUsdtWallet(trx, normalizedId, {
      [COLS.IS_DEFAULT]: true,
    });
  });
};

const deleteUsdtWalletItem = async (id) => {
  ensureDefinition();
  const normalizedId = validateDeletePayload(id);
  const current = await findUsdtWalletById(normalizedId);
  if (!current) {
    throw createHttpError(404, "Không tìm thấy ví.");
  }

  await deleteUsdtWallet(normalizedId);

  if (current.isDefault) {
    const remaining = await listUsdtWallets();
    const nextDefault = remaining.find((row) => row.isActive);
    if (nextDefault) {
      await db.transaction(async (trx) => {
        await clearDefaultFlags(trx);
        await updateUsdtWallet(trx, nextDefault.id, {
          [COLS.IS_DEFAULT]: true,
        });
      });
    }
  }

  return { success: true };
};

module.exports = {
  listUsdtWalletItems,
  getDefaultUsdtWallet,
  createUsdtWalletItem,
  updateUsdtWalletItem,
  setDefaultUsdtWalletItem,
  deleteUsdtWalletItem,
};
