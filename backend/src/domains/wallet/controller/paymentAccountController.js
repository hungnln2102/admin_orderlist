const logger = require("@/utils/logger");
const { writeUserEventLog } = require("@/domains/renew-adobe/services/systemEventLogService");

// Shop Bank Accounts Use Cases
const {
  listShopBankAccountItems,
  getDefaultShopBankAccount,
  createShopBankAccountItem,
  updateShopBankAccountItem,
  setDefaultShopBankAccountItem,
  deleteShopBankAccountItem,
} = require("@/domains/wallet/shop-bank-accounts/use-cases");
const { listShopBankAccountBalances } = require("@/domains/wallet/shop-bank-accounts/use-cases/listShopBankAccountBalances");
const { updateShopBankAccountWithdrawn } = require("@/domains/wallet/shop-bank-accounts/use-cases/updateShopBankAccountWithdrawn");
const { recordShopBankAccountWithdrawal } = require("@/domains/wallet/shop-bank-accounts/use-cases/recordShopBankAccountWithdrawal");

// USDT Wallets Use Cases
const {
  listUsdtWalletItems,
  getDefaultUsdtWallet,
  createUsdtWalletItem,
  updateUsdtWalletItem,
  setDefaultUsdtWalletItem,
  deleteUsdtWalletItem,
} = require("@/domains/wallet/usdt-wallets/use-cases");
const { listUsdtWalletBalances } = require("@/domains/wallet/usdt-wallets/use-cases/listUsdtWalletBalances");
const { recordUsdtWalletWithdrawal } = require("@/domains/wallet/usdt-wallets/use-cases/recordUsdtWalletWithdrawal");
const { getUsdtVndRate } = require("@/domains/wallet/usdt-wallets/services/binanceExchangeRateService");

const handleControllerError = (res, error, context) => {
  const status = Number.isInteger(error?.status) ? error.status : 500;

  if (status >= 500) {
    logger.error(context, { error: error.message, stack: error.stack });
  } else {
    logger.warn(context, { error: error.message });
  }

  return res.status(status).json({
    error: error?.message || "Có lỗi xảy ra.",
  });
};

// --- Shop Bank Accounts ---

const listShopBankAccounts = async (_req, res) => {
  try {
    const items = await listShopBankAccountItems();
    return res.json({ items });
  } catch (error) {
    return handleControllerError(res, error, "[shop-bank-accounts] list failed");
  }
};

const getDefaultShopBankAccountHandler = async (_req, res) => {
  try {
    const item = await getDefaultShopBankAccount();
    return res.json({ item });
  } catch (error) {
    return handleControllerError(res, error, "[shop-bank-accounts] default failed");
  }
};

const createShopBankAccount = async (req, res) => {
  try {
    const item = await createShopBankAccountItem(req.body);
    return res.status(201).json(item);
  } catch (error) {
    return handleControllerError(res, error, "[shop-bank-accounts] create failed");
  }
};

const updateShopBankAccount = async (req, res) => {
  try {
    const item = await updateShopBankAccountItem(req.params.id, req.body);
    return res.json(item);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[shop-bank-accounts] update failed (id=${req.params.id})`
    );
  }
};

const setDefaultShopBankAccount = async (req, res) => {
  try {
    const item = await setDefaultShopBankAccountItem(req.params.id);
    return res.json(item);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[shop-bank-accounts] set-default failed (id=${req.params.id})`
    );
  }
};

const removeShopBankAccount = async (req, res) => {
  try {
    const result = await deleteShopBankAccountItem(req.params.id);
    return res.json(result);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[shop-bank-accounts] delete failed (id=${req.params.id})`
    );
  }
};

const listShopBankAccountBalancesHandler = async (_req, res) => {
  try {
    const items = await listShopBankAccountBalances();
    return res.json({ items });
  } catch (error) {
    return handleControllerError(res, error, "[shop-bank-accounts] balances failed");
  }
};

const patchShopBankAccountWithdrawn = async (req, res) => {
  try {
    const item = await updateShopBankAccountWithdrawn(req.params.id, req.body);
    return res.json({ item });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[shop-bank-accounts] update withdrawn failed (id=${req.params.id})`
    );
  }
};

const postShopBankAccountWithdraw = async (req, res) => {
  try {
    const item = await recordShopBankAccountWithdrawal(req.params.id, req.body);
    writeUserEventLog(req, {
      action: "Rút tiền STK",
      entity: "Rút tiền",
      entityId: req.params.id,
      message: `Rút tiền STK ${item?.accountNumber || req.params.id} - số tiền: ${item?.withdrawnAmount ?? req.body?.amount}`,
      source: "finance.shop_bank_accounts.withdraw",
      metadata: {
        shopBankAccountId: Number(req.params.id) || null,
        accountNumber: item?.accountNumber || null,
        amount: item?.withdrawnAmount ?? req.body?.amount ?? null,
        reason: req.body?.reason || null,
      },
    });
    return res.status(201).json({ item });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[shop-bank-accounts] withdraw failed (id=${req.params.id})`
    );
  }
};

// --- USDT Wallets ---

const listUsdtWallets = async (_req, res) => {
  try {
    const items = await listUsdtWalletItems();
    return res.json({ items });
  } catch (error) {
    return handleControllerError(res, error, "[usdt-wallets] list failed");
  }
};

const getDefaultUsdtWalletHandler = async (_req, res) => {
  try {
    const item = await getDefaultUsdtWallet();
    return res.json({ item });
  } catch (error) {
    return handleControllerError(res, error, "[usdt-wallets] default failed");
  }
};

const getExchangeRateHandler = async (req, res) => {
  try {
    const forceRefresh = req.query?.refresh === "1" || req.query?.refresh === "true";
    const rate = await getUsdtVndRate({ forceRefresh });
    return res.json(rate);
  } catch (error) {
    return handleControllerError(res, error, "[usdt-wallets] exchange-rate failed");
  }
};

const createUsdtWallet = async (req, res) => {
  try {
    const item = await createUsdtWalletItem(req.body);
    return res.status(201).json(item);
  } catch (error) {
    return handleControllerError(res, error, "[usdt-wallets] create failed");
  }
};

const updateUsdtWallet = async (req, res) => {
  try {
    const item = await updateUsdtWalletItem(req.params.id, req.body);
    return res.json(item);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[usdt-wallets] update failed (id=${req.params.id})`
    );
  }
};

const setDefaultUsdtWallet = async (req, res) => {
  try {
    const item = await setDefaultUsdtWalletItem(req.params.id);
    return res.json(item);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[usdt-wallets] set-default failed (id=${req.params.id})`
    );
  }
};

const removeUsdtWallet = async (req, res) => {
  try {
    const result = await deleteUsdtWalletItem(req.params.id);
    return res.json(result);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[usdt-wallets] delete failed (id=${req.params.id})`
    );
  }
};

const listUsdtWalletBalancesHandler = async (_req, res) => {
  try {
    const items = await listUsdtWalletBalances();
    return res.json({ items });
  } catch (error) {
    return handleControllerError(res, error, "[usdt-wallets] balances failed");
  }
};

const postUsdtWalletWithdraw = async (req, res) => {
  try {
    const item = await recordUsdtWalletWithdrawal(req.params.id, req.body);
    return res.status(201).json({ item });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[usdt-wallets] withdraw failed (id=${req.params.id})`
    );
  }
};

module.exports = {
  listShopBankAccounts,
  getDefaultShopBankAccountHandler,
  createShopBankAccount,
  updateShopBankAccount,
  setDefaultShopBankAccount,
  removeShopBankAccount,
  listShopBankAccountBalancesHandler,
  patchShopBankAccountWithdrawn,
  postShopBankAccountWithdraw,

  listUsdtWallets,
  getDefaultUsdtWalletHandler,
  getExchangeRateHandler,
  createUsdtWallet,
  updateUsdtWallet,
  setDefaultUsdtWallet,
  removeUsdtWallet,
  listUsdtWalletBalancesHandler,
  postUsdtWalletWithdraw,
};
