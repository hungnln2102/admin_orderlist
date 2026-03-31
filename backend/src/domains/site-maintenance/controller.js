const { db } = require("../../db");
const logger = require("../../utils/logger");
const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  tableName,
} = require("../../config/dbSchema");

const TABLE = tableName(ADMIN_SCHEMA.SITE_SETTINGS.TABLE, SCHEMA_ADMIN);
const C = ADMIN_SCHEMA.SITE_SETTINGS.COLS;
const MAINTENANCE_KEY = "maintenance_mode";

const getMaintenanceStatus = async (_req, res) => {
  try {
    const row = await db(TABLE).where(C.KEY, MAINTENANCE_KEY).first();
    const enabled = row ? row[C.VALUE] === "on" : false;

    res.json({
      enabled,
      value: enabled ? "on" : "off",
      updatedAt: row ? row[C.UPDATED_AT] : null,
    });
  } catch (err) {
    logger.error("site-maintenance get error", err);
    res.status(500).json({ error: "Lỗi khi lấy trạng thái bảo trì." });
  }
};

const updateMaintenanceStatus = async (req, res) => {
  try {
    const { enabled } = req.body;
    const value = enabled ? "on" : "off";

    const [row] = await db(TABLE)
      .insert({
        [C.KEY]: MAINTENANCE_KEY,
        [C.VALUE]: value,
        [C.UPDATED_AT]: db.fn.now(),
      })
      .onConflict(C.KEY)
      .merge({
        [C.VALUE]: value,
        [C.UPDATED_AT]: db.fn.now(),
      })
      .returning("*");

    const isEnabled = row[C.VALUE] === "on";
    res.json({
      enabled: isEnabled,
      value: isEnabled ? "on" : "off",
      updatedAt: row[C.UPDATED_AT],
    });
  } catch (err) {
    logger.error("site-maintenance update error", err);
    res.status(500).json({ error: "Lỗi khi cập nhật trạng thái bảo trì." });
  }
};

module.exports = {
  getMaintenanceStatus,
  updateMaintenanceStatus,
};
