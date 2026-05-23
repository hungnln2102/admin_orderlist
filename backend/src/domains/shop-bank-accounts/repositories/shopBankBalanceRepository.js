const db = require("../../../db/knexClient");
const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  tableName,
} = require("../../../config/dbSchema");

const ACCOUNT_TABLE = tableName(ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.TABLE, SCHEMA_ADMIN);
const ACCOUNT_COLS = ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.COLS;

const sumActiveShopBankBalances = async () => {
  const row = await db(ACCOUNT_TABLE)
    .sum({ total: ACCOUNT_COLS.BALANCE })
    .where(ACCOUNT_COLS.IS_ACTIVE, true)
    .first();
  return Number(row?.total) || 0;
};

module.exports = { sumActiveShopBankBalances };
