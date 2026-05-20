const db = require("../../../db/knexClient");
const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  getDefinition,
  tableName,
} = require("../../../config/dbSchema");

const SCHEMA_COLS = ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.COLS;
const SHOP_BANK_ACCOUNTS_DEF = getDefinition("SHOP_BANK_ACCOUNTS", ADMIN_SCHEMA);

/** camelCase → tên cột DB (getDefinition); fallback từ ADMIN_SCHEMA.COLS */
const FALLBACK_COLUMNS = {
  id: SCHEMA_COLS.ID,
  label: SCHEMA_COLS.LABEL,
  accountNumber: SCHEMA_COLS.ACCOUNT_NUMBER,
  accountHolder: SCHEMA_COLS.ACCOUNT_HOLDER,
  bankBin: SCHEMA_COLS.BANK_BIN,
  bankShortCode: SCHEMA_COLS.BANK_SHORT_CODE,
  bankDisplayName: SCHEMA_COLS.BANK_DISPLAY_NAME,
  qrNotePrefix: SCHEMA_COLS.QR_NOTE_PREFIX,
  isDefault: SCHEMA_COLS.IS_DEFAULT,
  isActive: SCHEMA_COLS.IS_ACTIVE,
  createdAt: SCHEMA_COLS.CREATED_AT,
  updatedAt: SCHEMA_COLS.UPDATED_AT,
};

const columns = SHOP_BANK_ACCOUNTS_DEF?.columns || FALLBACK_COLUMNS;

const TABLE = tableName(
  SHOP_BANK_ACCOUNTS_DEF?.tableName || ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.TABLE,
  SCHEMA_ADMIN
);

const selectColumns = {
  id: columns.id,
  label: columns.label,
  accountNumber: columns.accountNumber,
  accountHolder: columns.accountHolder,
  bankBin: columns.bankBin,
  bankShortCode: columns.bankShortCode,
  bankDisplayName: columns.bankDisplayName,
  qrNotePrefix: columns.qrNotePrefix,
  isDefault: columns.isDefault,
  isActive: columns.isActive,
  createdAt: columns.createdAt,
  updatedAt: columns.updatedAt,
};

const listShopBankAccounts = async () =>
  db(TABLE)
    .select(selectColumns)
    .orderBy(columns.isDefault, "desc")
    .orderBy(columns.isActive, "desc")
    .orderBy(columns.id, "desc");

const findShopBankAccountById = async (id) =>
  db(TABLE).select(selectColumns).where(columns.id, id).first();

const findDefaultActiveAccount = async () =>
  db(TABLE)
    .select(selectColumns)
    .where(columns.isActive, true)
    .where(columns.isDefault, true)
    .orderBy(columns.id, "desc")
    .first();

const findShopBankAccountByNumber = async (accountNumber) =>
  db(TABLE)
    .select(selectColumns)
    .whereRaw("TRIM(??) = ?", [columns.accountNumber, accountNumber])
    .first();

const clearDefaultFlags = async (trx) =>
  trx(TABLE).where(columns.isDefault, true).update({
    [columns.isDefault]: false,
    [columns.updatedAt]: trx.fn.now(),
  });

const insertShopBankAccount = async (trx, payload) => {
  const rows = await trx(TABLE).insert(payload).returning(selectColumns);
  return rows[0] || null;
};

const updateShopBankAccount = async (trx, id, payload) => {
  const rows = await trx(TABLE)
    .where(columns.id, id)
    .update({
      ...payload,
      [columns.updatedAt]: trx.fn.now(),
    })
    .returning(selectColumns);
  return rows[0] || null;
};

const deleteShopBankAccount = async (id) => db(TABLE).where(columns.id, id).del();

module.exports = {
  SHOP_BANK_ACCOUNTS_DEF,
  /** Tên cột snake_case cho insert/update payload (use-cases) */
  COLS: SCHEMA_COLS,
  columns,
  TABLE,
  selectColumns,
  listShopBankAccounts,
  findShopBankAccountById,
  findDefaultActiveAccount,
  findShopBankAccountByNumber,
  clearDefaultFlags,
  insertShopBankAccount,
  updateShopBankAccount,
  deleteShopBankAccount,
};
