const db = require("@/db/knexClient");
const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  tableName,
} = require("@/config/dbSchema");

const ACCOUNT_TABLE = tableName(ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.TABLE, SCHEMA_ADMIN);
const ACCOUNT_COLS = ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.COLS;

const sumActiveShopBankBalances = async (executor = null) => {
  if (executor && typeof executor.query === "function") {
    const res = await executor.query(
      `SELECT COALESCE(SUM(${ACCOUNT_COLS.BALANCE}::numeric), 0) AS total
       FROM ${ACCOUNT_TABLE}
       WHERE ${ACCOUNT_COLS.IS_ACTIVE} = TRUE`
    );
    return Number(res.rows?.[0]?.total) || 0;
  }

  const queryBuilder = executor && typeof executor === "function" ? executor : db;
  const row = await queryBuilder(ACCOUNT_TABLE)
    .sum({ total: ACCOUNT_COLS.BALANCE })
    .where(ACCOUNT_COLS.IS_ACTIVE, true)
    .first();
  return Number(row?.total) || 0;
};

module.exports = { sumActiveShopBankBalances };
