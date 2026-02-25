const db = require("../../db/knexClient");
const {
  IDENTITY_SCHEMA,
  getDefinition,
  tableName,
  SCHEMA_IDENTITY,
} = require("../../config/dbSchema");
const logger = require("../../utils/logger");

const ACCOUNTS_DEF = getDefinition("ACCOUNTS", IDENTITY_SCHEMA);
const ROLES_DEF = getDefinition("ROLES", IDENTITY_SCHEMA);

const ACCOUNTS_TABLE = tableName(
  ACCOUNTS_DEF?.tableName || "accounts",
  SCHEMA_IDENTITY
);
const ROLES_TABLE = tableName(
  ROLES_DEF?.tableName || "roles",
  SCHEMA_IDENTITY
);

const listAccounts = async (_req, res) => {
  try {
    if (!ACCOUNTS_DEF || !ROLES_DEF) {
      return res.status(500).json({
        error: "Thiếu cấu hình bảng accounts/roles trong IDENTITY_SCHEMA",
      });
    }

    const aCols = ACCOUNTS_DEF.columns;
    const rCols = ROLES_DEF.columns;

    const rows = await db(ACCOUNTS_TABLE)
      .leftJoin(
        ROLES_TABLE,
        `${ACCOUNTS_TABLE}.${aCols.roleId}`,
        `${ROLES_TABLE}.${rCols.id}`
      )
      .select({
        id: `${ACCOUNTS_TABLE}.${aCols.id}`,
        email: `${ACCOUNTS_TABLE}.${aCols.email}`,
        username: `${ACCOUNTS_TABLE}.${aCols.username}`,
        isActive: `${ACCOUNTS_TABLE}.${aCols.isActive}`,
        createdAt: `${ACCOUNTS_TABLE}.${aCols.createdAt}`,
        suspendedUntil: `${ACCOUNTS_TABLE}.${aCols.suspendedUntil}`,
        banReason: `${ACCOUNTS_TABLE}.${aCols.banReason}`,
        updatedAt: `${ACCOUNTS_TABLE}.${aCols.updatedAt}`,
        roleId: `${ACCOUNTS_TABLE}.${aCols.roleId}`,
        roleCode: `${ROLES_TABLE}.${rCols.code}`,
        roleName: `${ROLES_TABLE}.${rCols.name}`,
      })
      .orderBy([
        { column: `${ROLES_TABLE}.${rCols.code}`, order: "asc" },
        { column: `${ACCOUNTS_TABLE}.${aCols.username}`, order: "asc" },
      ]);

    res.json({ items: rows });
  } catch (error) {
    logger.error("[accounts] Query failed (list)", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Không thể tải danh sách tài khoản.",
    });
  }
};

module.exports = {
  listAccounts,
};

