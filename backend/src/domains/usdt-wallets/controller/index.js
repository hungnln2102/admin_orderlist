const logger = require("../../../utils/logger");
const {
  listUsdtWalletItems,
  getDefaultUsdtWallet,
  createUsdtWalletItem,
  updateUsdtWalletItem,
  setDefaultUsdtWalletItem,
  deleteUsdtWalletItem,
} = require("../use-cases");
const { listUsdtWalletBalances } = require("../use-cases/listUsdtWalletBalances");
const { recordUsdtWalletWithdrawal } = require("../use-cases/recordUsdtWalletWithdrawal");
const { getUsdtVndRate } = require("../services/binanceExchangeRateService");

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
