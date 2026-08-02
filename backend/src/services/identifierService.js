const crypto = require("crypto");
const { db } = require("@/db");
const {
  tableName,
  getDefinition,
  PARTNER_SCHEMA,
  PRODUCT_SCHEMA,
  SCHEMA_PRODUCT,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  ORDERS_SCHEMA,
  SCHEMA_ORDERS,
} = require("@/config/dbSchema");
const { TABLES: ORDER_TABLES, COLS: ORDER_COLS } = require("@/domains/orders/controller/constants");
const logger = require("@/utils/logger");

// ==========================================
// 1. Database ID Service Logic
// ==========================================

const PRODUCT_DESC_DEF = getDefinition("PRODUCT_DESC", PRODUCT_SCHEMA);

const ID_TABLES = {
  supply: tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_SUPPLIER),
  supplyPrice: tableName(PARTNER_SCHEMA.SUPPLIER_COST.TABLE, SCHEMA_SUPPLIER_COST),
  productDesc: tableName(PRODUCT_DESC_DEF.tableName, SCHEMA_PRODUCT),
};

const SUPPLY_COLS = getDefinition("SUPPLIER", PARTNER_SCHEMA).columns;
const SUPPLY_PRICE_COLS = getDefinition("SUPPLIER_COST", PARTNER_SCHEMA).columns;
const PRODUCT_DESC_COLS = PRODUCT_DESC_DEF.columns;

// Helper that assumes it is already running inside a transaction
const nextIdInTransaction = async (trx, tableName, columnName = "id") => {
  await trx.raw(`LOCK TABLE ${tableName} IN EXCLUSIVE MODE;`);
  const result = await trx.raw(
    `SELECT COALESCE(MAX(${columnName}), 0) + 1 AS next_id FROM ${tableName};`
  );
  const nextRow = result?.rows?.[0] || {};
  const nextIdValue = Number(nextRow.next_id);
  return Number.isFinite(nextIdValue) ? nextIdValue : 1;
};

/**
 * Generate the next integer id for a table.
 *
 * - If a transaction object is passed, it will be used.
 * - If not, this helper will open its own transaction so that
 *   the LOCK TABLE statement is always executed inside a
 *   valid transaction block (required by PostgreSQL).
 */
const nextId = async (tableName, columnName = "id", trx = null) => {
  // Check if trx is an actual transaction (has commit method)
  if (trx && typeof trx.commit === 'function') {
    return nextIdInTransaction(trx, tableName, columnName);
  }

  return db.transaction(async (innerTrx) =>
    nextIdInTransaction(innerTrx, tableName, columnName)
  );
};

const getNextSupplyId = (trx = null) =>
  nextId(ID_TABLES.supply, SUPPLY_COLS.id, trx);

const getNextSupplyPriceId = (trx = null) =>
  nextId(ID_TABLES.supplyPrice, SUPPLY_PRICE_COLS.id, trx);

const getNextProductDescId = (trx = null) =>
  nextId(ID_TABLES.productDesc, PRODUCT_DESC_COLS.id, trx);

// ==========================================
// 2. Order Code Generation Service Logic
// ==========================================

const MAX_RETRIES_ORDER = 10;
const VALID_PREFIXES = ["MAVC", "MAVL", "MAVK", "MAVT", "MAVN", "MAVS"];
const RANDOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RANDOM_SUFFIX_LENGTH = 5;

function generateRandomSuffix(length = RANDOM_SUFFIX_LENGTH) {
  let output = "";
  const bytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i += 1) {
    output += RANDOM_ALPHABET[bytes[i] % RANDOM_ALPHABET.length];
  }

  return output;
}

/**
 * Pure generation (no DB check).
 * @param {string} prefix - One of MAVC/MAVL/MAVK/MAVT/MAVN/MAVS
 * @returns {string}
 */
function generateOrderCode(prefix = "MAVC") {
  const normalizedPrefix = VALID_PREFIXES.includes(prefix) ? prefix : "MAVC";
  const suffix = generateRandomSuffix();
  return `${normalizedPrefix}${suffix}`;
}

/**
 * Generate a unique order code, verified against DB.
 * @param {string} prefix - Order code prefix
 * @param {import("knex").Knex.Transaction|null} trx - Optional transaction
 * @returns {Promise<string>}
 */
async function generateUniqueOrderCode(prefix = "MAVC", trx = null) {
  const p = VALID_PREFIXES.includes(prefix) ? prefix : "MAVC";
  const idOrderCol = ORDER_COLS.ORDER.ID_ORDER;
  const queryBuilder = trx || db;

  for (let attempt = 0; attempt < MAX_RETRIES_ORDER; attempt += 1) {
    const code = generateOrderCode(p);

    const existing = await queryBuilder(ORDER_TABLES.orderList)
      .where(idOrderCol, code)
      .select(idOrderCol)
      .first();

    if (!existing) return code;

    logger.warn("[OrderCode] Collision detected, retrying", { code, attempt });
  }

  throw new Error("Không thể tạo mã đơn duy nhất sau nhiều lần thử. Vui lòng thử lại.");
}

// ==========================================
// 3. Transaction Code Generation Service Logic
// ==========================================

const MAX_RETRIES_TX = 12;
const TRANSACTION_CODE_LENGTH = 8;
const TRANSACTION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const TRANSACTION_CODE_REGEX_STRICT = new RegExp(
  `^[A-Z0-9]{${TRANSACTION_CODE_LENGTH}}$`,
  "i"
);
const TRANSACTION_CODE_REGEX_GLOBAL = new RegExp(
  `\\b[A-Z0-9]{${TRANSACTION_CODE_LENGTH}}\\b`,
  "gi"
);

const ORDER_LIST_TABLE = tableName(
  ORDERS_SCHEMA.ORDER_LIST.TABLE,
  SCHEMA_ORDERS
);
const TRANSACTION_COL = ORDERS_SCHEMA.ORDER_LIST.COLS.TRANSACTION;

function generateTransactionCode() {
  let output = "";
  const bytes = crypto.randomBytes(TRANSACTION_CODE_LENGTH);
  for (let i = 0; i < TRANSACTION_CODE_LENGTH; i += 1) {
    output += TRANSACTION_ALPHABET[bytes[i] % TRANSACTION_ALPHABET.length];
  }
  return output.toUpperCase();
}

function normalizeTransactionCode(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return "";
  return TRANSACTION_CODE_REGEX_STRICT.test(text) ? text : "";
}

/**
 * @param {import("knex").Knex.Transaction|null} trx
 * @returns {Promise<string>}
 */
async function generateUniqueTransactionCode(trx = null) {
  const queryBuilder = trx || db;

  for (let attempt = 0; attempt < MAX_RETRIES_TX; attempt += 1) {
    const code = generateTransactionCode();
    const existing = await queryBuilder(ORDER_LIST_TABLE)
      .whereRaw(`UPPER(TRIM(??)) = ?`, [TRANSACTION_COL, code])
      .select(TRANSACTION_COL)
      .first();

    if (!existing) return code;
    logger.warn("[TransactionCode] Collision detected, retrying", { code, attempt });
  }

  throw new Error(
    "Không thể tạo mã transaction duy nhất sau nhiều lần thử. Vui lòng thử lại."
  );
}

module.exports = {
  // ID Service
  nextId,
  getNextSupplyId,
  getNextSupplyPriceId,
  getNextProductDescId,

  // Order Code Service
  generateOrderCode,
  generateUniqueOrderCode,
  VALID_PREFIXES,

  // Transaction Code Service
  TRANSACTION_CODE_LENGTH,
  TRANSACTION_CODE_REGEX_STRICT,
  TRANSACTION_CODE_REGEX_GLOBAL,
  generateTransactionCode,
  generateUniqueTransactionCode,
  normalizeTransactionCode,
};
