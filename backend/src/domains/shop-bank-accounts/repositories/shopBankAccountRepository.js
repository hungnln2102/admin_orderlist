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
  totalWithdrawn: SCHEMA_COLS.TOTAL_WITHDRAWN,
  totalReceived: SCHEMA_COLS.TOTAL_RECEIVED,
  balance: SCHEMA_COLS.BALANCE,
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
  totalWithdrawn: columns.totalWithdrawn,
  totalReceived: columns.totalReceived,
  balance: columns.balance,
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

const findShopBankAccountByNumberAndBankBin = async (accountNumber, bankBin) =>
  db(TABLE)
    .select(selectColumns)
    .whereRaw("TRIM(??) = ?", [columns.accountNumber, accountNumber])
    .whereRaw("TRIM(??) = ?", [columns.bankBin, bankBin])
    .first();

const MAVRYK_DEFAULT_ACCOUNT_NUMBER = "9183400998";
const MAVRYK_FALLBACK_HOLDER = "NGO LE NGOC HUNG";

/**
 * Mục 3 (MAVN nội bộ) + mục 4 (renewal Mavryk auto) trừ STK Mavryk shop.
 * Ưu tiên 1: STK `9183400998` (mặc định Mavryk).
 * Fallback: bất kỳ STK active nào có chủ tài khoản "NGO LE NGOC HUNG", ưu tiên STK đủ tiền.
 * Cả hai đường đều chỉ chọn STK đang bật. Trả null nếu không tìm thấy.
 */
const resolveMavrykDefaultBankAccount = async (amount = 0, executor = db) => {
  const primary = await executor(TABLE)
    .select(selectColumns)
    .where(columns.isActive, true)
    .whereRaw("TRIM(REGEXP_REPLACE(??, '\\s+', '', 'g')) = ?", [
      columns.accountNumber,
      MAVRYK_DEFAULT_ACCOUNT_NUMBER,
    ])
    .first();
  if (primary) return primary;

  const minAmount = Number.isFinite(Number(amount)) ? Math.max(0, Number(amount)) : 0;
  const fallbackRows = await executor(TABLE)
    .select(selectColumns)
    .where(columns.isActive, true)
    .whereRaw("UPPER(TRIM(??)) = ?", [
      columns.accountHolder,
      MAVRYK_FALLBACK_HOLDER.toUpperCase(),
    ])
    .orderBy(columns.balance, "desc")
    .orderBy(columns.id, "asc");

  const sufficient = fallbackRows.find(
    (row) => Number(row.balance) >= minAmount
  );
  return sufficient || fallbackRows[0] || null;
};

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
  findShopBankAccountByNumberAndBankBin,
  resolveMavrykDefaultBankAccount,
  MAVRYK_DEFAULT_ACCOUNT_NUMBER,
  MAVRYK_FALLBACK_HOLDER,
  clearDefaultFlags,
  insertShopBankAccount,
  updateShopBankAccount,
  deleteShopBankAccount,
};
