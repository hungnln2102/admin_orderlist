const db = require("@/db/knexClient");
const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  getDefinition,
  tableName,
} = require("@/config/dbSchema");

const SCHEMA_COLS = ADMIN_SCHEMA.USDT_WALLETS.COLS;
const USDT_WALLETS_DEF = getDefinition("USDT_WALLETS", ADMIN_SCHEMA);

const FALLBACK_COLUMNS = {
  id: SCHEMA_COLS.ID,
  label: SCHEMA_COLS.LABEL,
  walletAddress: SCHEMA_COLS.WALLET_ADDRESS,
  network: SCHEMA_COLS.NETWORK,
  isDefault: SCHEMA_COLS.IS_DEFAULT,
  isActive: SCHEMA_COLS.IS_ACTIVE,
  totalWithdrawn: SCHEMA_COLS.TOTAL_WITHDRAWN,
  totalReceived: SCHEMA_COLS.TOTAL_RECEIVED,
  balance: SCHEMA_COLS.BALANCE,
  createdAt: SCHEMA_COLS.CREATED_AT,
  updatedAt: SCHEMA_COLS.UPDATED_AT,
};

const columns = USDT_WALLETS_DEF?.columns || FALLBACK_COLUMNS;

const TABLE = tableName(
  USDT_WALLETS_DEF?.tableName || ADMIN_SCHEMA.USDT_WALLETS.TABLE,
  SCHEMA_ADMIN
);

const selectColumns = {
  id: columns.id,
  label: columns.label,
  walletAddress: columns.walletAddress,
  network: columns.network,
  isDefault: columns.isDefault,
  isActive: columns.isActive,
  totalWithdrawn: columns.totalWithdrawn,
  totalReceived: columns.totalReceived,
  balance: columns.balance,
  createdAt: columns.createdAt,
  updatedAt: columns.updatedAt,
};

const listUsdtWallets = async () =>
  db(TABLE)
    .select(selectColumns)
    .orderBy(columns.isDefault, "desc")
    .orderBy(columns.isActive, "desc")
    .orderBy(columns.id, "desc");

const findUsdtWalletById = async (id) =>
  db(TABLE).select(selectColumns).where(columns.id, id).first();

const findDefaultActiveUsdtWallet = async () =>
  db(TABLE)
    .select(selectColumns)
    .where(columns.isActive, true)
    .where(columns.isDefault, true)
    .orderBy(columns.id, "desc")
    .first();

const findUsdtWalletByAddress = async (walletAddress) =>
  db(TABLE)
    .select(selectColumns)
    .whereRaw("LOWER(TRIM(??)) = ?", [
      columns.walletAddress,
      String(walletAddress || "").trim().toLowerCase(),
    ])
    .first();

const clearDefaultFlags = async (trx) =>
  trx(TABLE).where(columns.isDefault, true).update({
    [columns.isDefault]: false,
    [columns.updatedAt]: trx.fn.now(),
  });

const insertUsdtWallet = async (trx, payload) => {
  const rows = await trx(TABLE).insert(payload).returning(selectColumns);
  return rows[0] || null;
};

const updateUsdtWallet = async (trx, id, payload) => {
  const rows = await trx(TABLE)
    .where(columns.id, id)
    .update({
      ...payload,
      [columns.updatedAt]: trx.fn.now(),
    })
    .returning(selectColumns);
  return rows[0] || null;
};

const deleteUsdtWallet = async (id) => db(TABLE).where(columns.id, id).del();

module.exports = {
  USDT_WALLETS_DEF,
  COLS: SCHEMA_COLS,
  columns,
  TABLE,
  selectColumns,
  listUsdtWallets,
  findUsdtWalletById,
  findDefaultActiveUsdtWallet,
  findUsdtWalletByAddress,
  clearDefaultFlags,
  insertUsdtWallet,
  updateUsdtWallet,
  deleteUsdtWallet,
};
