/**
 * Sinh mã transaction (nội dung CK) — chữ + số, cố định độ dài, unique trên order_list.
 */

const crypto = require("crypto");
const { db } = require("../db");
const { ORDERS_SCHEMA, tableName, SCHEMA_ORDERS } = require("../config/dbSchema");
const logger = require("../utils/logger");

const MAX_RETRIES = 12;
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

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
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
  TRANSACTION_CODE_LENGTH,
  TRANSACTION_CODE_REGEX_STRICT,
  TRANSACTION_CODE_REGEX_GLOBAL,
  generateTransactionCode,
  generateUniqueTransactionCode,
  normalizeTransactionCode,
};
