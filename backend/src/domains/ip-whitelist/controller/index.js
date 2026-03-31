const logger = require("../../../utils/logger");
const {
  listIpWhitelistItems,
  createIpWhitelistItem,
  updateIpWhitelistItem,
  deleteIpWhitelistItem,
} = require("../use-cases");

const handleControllerError = (res, error, context) => {
  const status = Number.isInteger(error?.status) ? error.status : 500;

  if (status >= 500) {
    logger.error(context, {
      error: error.message,
      stack: error.stack,
    });
  } else {
    logger.warn(context, {
      error: error.message,
    });
  }

  return res.status(status).json({
    error: error?.message || "Có lỗi xảy ra.",
  });
};

const listIpWhitelists = async (_req, res) => {
  try {
    const items = await listIpWhitelistItems();
    return res.json({ items });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "[ip-whitelist] Query failed (list)"
    );
  }
};

const createIpWhitelist = async (req, res) => {
  try {
    const item = await createIpWhitelistItem(req.body);
    return res.status(201).json(item);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "[ip-whitelist] Insert failed (create)"
    );
  }
};

const updateIpWhitelist = async (req, res) => {
  try {
    const item = await updateIpWhitelistItem(req.params.id, req.body);
    return res.json(item);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[ip-whitelist] Update failed (id=${req.params.id})`
    );
  }
};

const removeIpWhitelist = async (req, res) => {
  try {
    const result = await deleteIpWhitelistItem(req.params.id);
    return res.json(result);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      `[ip-whitelist] Delete failed (id=${req.params.id})`
    );
  }
};

module.exports = {
  listIpWhitelists,
  createIpWhitelist,
  updateIpWhitelist,
  removeIpWhitelist,
};
