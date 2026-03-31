const db = require("../../../db/knexClient");
const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  getDefinition,
  tableName,
} = require("../../../config/dbSchema");

const IP_WHITELISTS_DEF = getDefinition("IP_WHITELISTS", ADMIN_SCHEMA);

const FALLBACK_COLUMNS = {
  id: "id",
  ipAddress: "ip_address",
  label: "label",
  isActive: "is_active",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

const columns = IP_WHITELISTS_DEF?.columns || FALLBACK_COLUMNS;
const IP_WHITELISTS_TABLE = tableName(
  IP_WHITELISTS_DEF?.tableName || "ip_whitelist",
  SCHEMA_ADMIN
);
const descriptionColumn = columns.label || columns.description || "label";
const isActiveColumn = columns.isActive || "is_active";

const selectColumns = {
  id: columns.id,
  ipAddress: columns.ipAddress,
  description: descriptionColumn,
  isActive: isActiveColumn,
  createdAt: columns.createdAt,
  updatedAt: columns.updatedAt,
};

const listIpWhitelists = async () =>
  db(IP_WHITELISTS_TABLE)
    .select(selectColumns)
    .orderBy(columns.createdAt, "desc")
    .orderBy(columns.id, "desc");

const findIpWhitelistById = async (id) =>
  db(IP_WHITELISTS_TABLE)
    .select(selectColumns)
    .where(columns.id, id)
    .first();

const findIpWhitelistByAddress = async (ipAddress) =>
  db(IP_WHITELISTS_TABLE)
    .select(selectColumns)
    .whereRaw("LOWER(??) = ?", [columns.ipAddress, ipAddress])
    .first();

const createIpWhitelist = async ({ ipAddress, description }) => {
  const rows = await db(IP_WHITELISTS_TABLE)
    .insert({
      [columns.ipAddress]: ipAddress,
      [descriptionColumn]: description,
      [isActiveColumn]: true,
    })
    .returning(selectColumns);

  return rows[0] || null;
};

const updateIpWhitelist = async (id, { ipAddress, description }) => {
  const updatePayload = {
    [columns.updatedAt]: db.fn.now(),
  };

  if (typeof ipAddress !== "undefined") {
    updatePayload[columns.ipAddress] = ipAddress;
  }

  if (typeof description !== "undefined") {
    updatePayload[descriptionColumn] = description;
  }

  const rows = await db(IP_WHITELISTS_TABLE)
    .where(columns.id, id)
    .update(updatePayload)
    .returning(selectColumns);

  return rows[0] || null;
};

const deleteIpWhitelist = async (id) =>
  db(IP_WHITELISTS_TABLE).where(columns.id, id).del();

module.exports = {
  IP_WHITELISTS_DEF,
  listIpWhitelists,
  findIpWhitelistById,
  findIpWhitelistByAddress,
  createIpWhitelist,
  updateIpWhitelist,
  deleteIpWhitelist,
};
