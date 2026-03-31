const db = require("../../../db/knexClient");
const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  getDefinition,
  tableName,
} = require("../../../config/dbSchema");

const SITE_SETTINGS_DEF = getDefinition("SITE_SETTINGS", ADMIN_SCHEMA);

const FALLBACK_COLUMNS = {
  key: "key",
  value: "value",
  updatedAt: "updated_at",
};

const columns = SITE_SETTINGS_DEF?.columns || FALLBACK_COLUMNS;
const SITE_SETTINGS_TABLE = tableName(
  SITE_SETTINGS_DEF?.tableName || "site_settings",
  SCHEMA_ADMIN
);

const MAINTENANCE_KEY = "maintenance_mode";

const readMaintenanceSetting = async () =>
  db(SITE_SETTINGS_TABLE)
    .select({
      key: columns.key,
      value: columns.value,
      updatedAt: columns.updatedAt,
    })
    .where(columns.key, MAINTENANCE_KEY)
    .first();

const writeMaintenanceSetting = async (enabled) => {
  const nextValue = enabled ? "on" : "off";

  const rows = await db(SITE_SETTINGS_TABLE)
    .insert({
      [columns.key]: MAINTENANCE_KEY,
      [columns.value]: nextValue,
      [columns.updatedAt]: db.fn.now(),
    })
    .onConflict(columns.key)
    .merge({
      [columns.value]: nextValue,
      [columns.updatedAt]: db.fn.now(),
    })
    .returning({
      key: columns.key,
      value: columns.value,
      updatedAt: columns.updatedAt,
    });

  return rows[0] || null;
};

module.exports = {
  SITE_SETTINGS_DEF,
  MAINTENANCE_KEY,
  readMaintenanceSetting,
  writeMaintenanceSetting,
};
