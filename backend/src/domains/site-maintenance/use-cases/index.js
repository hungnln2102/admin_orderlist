const {
  SITE_SETTINGS_DEF,
  readMaintenanceSetting,
  writeMaintenanceSetting,
} = require("../repositories/siteMaintenanceRepository");

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const ensureDefinition = () => {
  if (!SITE_SETTINGS_DEF) {
    throw createHttpError(
      500,
      "Thiếu cấu hình bảng site_settings trong ADMIN_SCHEMA."
    );
  }
};

const normalizeMaintenanceRow = (row) => ({
  enabled: row?.value === "on",
  value: row?.value === "on" ? "on" : "off",
  updatedAt: row?.updatedAt ?? null,
});

const getSiteMaintenanceStatus = async () => {
  ensureDefinition();
  const current = await readMaintenanceSetting();
  return normalizeMaintenanceRow(current);
};

const updateSiteMaintenanceStatus = async (payload) => {
  ensureDefinition();

  if (typeof payload?.enabled !== "boolean") {
    throw createHttpError(400, 'Body cần { "enabled": true/false }');
  }

  const saved = await writeMaintenanceSetting(payload.enabled);
  return normalizeMaintenanceRow(saved);
};

module.exports = {
  getSiteMaintenanceStatus,
  updateSiteMaintenanceStatus,
};
