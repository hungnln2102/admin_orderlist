const logger = require("../../../utils/logger");
const {
  listShopBankAccountItems,
  getDefaultShopBankAccount,
  createShopBankAccountItem,
  updateShopBankAccountItem,
  setDefaultShopBankAccountItem,
  deleteShopBankAccountItem,
} = require("../use-cases");

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

module.exports = {
  listShopBankAccounts,
  getDefaultShopBankAccountHandler,
  createShopBankAccount,
  updateShopBankAccount,
  setDefaultShopBankAccount,
  removeShopBankAccount,
};
