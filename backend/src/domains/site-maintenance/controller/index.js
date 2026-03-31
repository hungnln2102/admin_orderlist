const logger = require("../../../utils/logger");
const {
  getSiteMaintenanceStatus,
  updateSiteMaintenanceStatus,
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

const getMaintenanceStatus = async (_req, res) => {
  try {
    const payload = await getSiteMaintenanceStatus();
    return res.json(payload);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "[site-maintenance] Query failed (status)"
    );
  }
};

const updateMaintenanceStatus = async (req, res) => {
  try {
    const payload = await updateSiteMaintenanceStatus(req.body);
    return res.json(payload);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "[site-maintenance] Update failed (status)"
    );
  }
};

module.exports = {
  getMaintenanceStatus,
  updateMaintenanceStatus,
};
