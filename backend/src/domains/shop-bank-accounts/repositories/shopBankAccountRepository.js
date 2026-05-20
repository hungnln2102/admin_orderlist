const db = require("../../../db/knexClient");
const {
  ADMIN_SCHEMA,
  SCHEMA_ADMIN,
  getDefinition,
  tableName,
} = require("../../../config/dbSchema");

const DEF = getDefinition("SHOP_BANK_ACCOUNTS", ADMIN_SCHEMA);
const COLS = DEF?.columns || ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.COLS;
const TABLE = tableName(
  DEF?.tableName || ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.TABLE,
  SCHEMA_ADMIN
);

const selectColumns = {
  id: COLS.ID,
  label: COLS.LABEL,
  accountNumber: COLS.ACCOUNT_NUMBER,
  accountHolder: COLS.ACCOUNT_HOLDER,
  bankBin: COLS.BANK_BIN,
  bankShortCode: COLS.BANK_SHORT_CODE,
  bankDisplayName: COLS.BANK_DISPLAY_NAME,
  qrNotePrefix: COLS.QR_NOTE_PREFIX,
  isDefault: COLS.IS_DEFAULT,
  isActive: COLS.IS_ACTIVE,
  createdAt: COLS.CREATED_AT,
  updatedAt: COLS.UPDATED_AT,
};

const listShopBankAccounts = async () =>
  db(TABLE)
    .select(selectColumns)
    .orderBy(COLS.IS_DEFAULT, "desc")
    .orderBy(COLS.IS_ACTIVE, "desc")
    .orderBy(COLS.ID, "desc");

const findShopBankAccountById = async (id) =>
  db(TABLE).select(selectColumns).where(COLS.ID, id).first();

const findDefaultActiveAccount = async () =>
  db(TABLE)
    .select(selectColumns)
    .where(COLS.IS_ACTIVE, true)
    .where(COLS.IS_DEFAULT, true)
    .orderBy(COLS.ID, "desc")
    .first();

const findShopBankAccountByNumber = async (accountNumber) =>
  db(TABLE)
    .select(selectColumns)
    .whereRaw("TRIM(??) = ?", [COLS.ACCOUNT_NUMBER, accountNumber])
    .first();

const clearDefaultFlags = async (trx) =>
  trx(TABLE).where(COLS.IS_DEFAULT, true).update({
    [COLS.IS_DEFAULT]: false,
    [COLS.UPDATED_AT]: trx.fn.now(),
  });

const insertShopBankAccount = async (trx, payload) => {
  const rows = await trx(TABLE).insert(payload).returning(selectColumns);
  return rows[0] || null;
};

const updateShopBankAccount = async (trx, id, payload) => {
  const rows = await trx(TABLE)
    .where(COLS.ID, id)
    .update({
      ...payload,
      [COLS.UPDATED_AT]: trx.fn.now(),
    })
    .returning(selectColumns);
  return rows[0] || null;
};

const deleteShopBankAccount = async (id) => db(TABLE).where(COLS.ID, id).del();

module.exports = {
  SHOP_BANK_ACCOUNTS_DEF: DEF,
  COLS,
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
