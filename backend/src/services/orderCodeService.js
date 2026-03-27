/**
 * Unified order code generation for both admin_orderlist and Website.
 *
 * Format: PREFIX + RANDOM(5)
 *   - PREFIX: MAVC, MAVL, MAVK, MAVT, MAVN, MAVS (4 chars)
 *   - RANDOM: 5 uppercase chars from a compact alphabet
 *   -> Total: 9 chars
 *
 * Always checks DB before returning.
 * Retries up to MAX_RETRIES times on collision.
 */

const crypto = require("crypto");
const { db } = require("../db");
const { TABLES, COLS } = require("../controllers/Order/constants");
const logger = require("../utils/logger");

const MAX_RETRIES = 10;
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
  const idOrderCol = COLS.ORDER.ID_ORDER;
  const queryBuilder = trx || db;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const code = generateOrderCode(p);

    const existing = await queryBuilder(TABLES.orderList)
      .where(idOrderCol, code)
      .select(idOrderCol)
      .first();

    if (!existing) return code;

    logger.warn("[OrderCode] Collision detected, retrying", { code, attempt });
  }

  throw new Error("Khong the tao ma don duy nhat sau nhieu lan thu. Vui long thu lai.");
}

module.exports = {
  generateOrderCode,
  generateUniqueOrderCode,
  VALID_PREFIXES,
};
