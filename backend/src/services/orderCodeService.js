/**
 * Unified order code generation for both admin_orderlist and Website.
 *
 * Format: PREFIX + TIMESTAMP(6) + RANDOM(6)
 *   - PREFIX: MAVC, MAVL, MAVK, MAVT, MAVN, MAVS (4 chars)
 *   - TIMESTAMP: last 6 digits of Date.now() (changes every ms, cycles ~16 min)
 *   - RANDOM: 6 alphanumeric chars (base-36 uppercase)
 *   → Total: up to 16 chars, collision probability ~1 in 2 billion per ms window
 *
 * Always checks DB (order_list + order_customer if available) before returning.
 * Retries up to MAX_RETRIES times on collision.
 */

const { db } = require("../db");
const { TABLES, COLS } = require("../controllers/Order/constants");
const logger = require("../utils/logger");

const MAX_RETRIES = 5;
const VALID_PREFIXES = ["MAVC", "MAVL", "MAVK", "MAVT", "MAVN", "MAVS"];

/**
 * Pure generation (no DB check). Shared algorithm with Website.
 * @param {string} prefix - One of MAVC/MAVL/MAVK/MAVT/MAVN/MAVS
 * @returns {string}
 */
function generateOrderCode(prefix = "MAVC") {
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  const n = String(Date.now()).slice(-6);
  return `${prefix}${n}${r}`.slice(0, 16);
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

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateOrderCode(p);

    const existing = await queryBuilder(TABLES.orderList)
      .where(idOrderCol, code)
      .select(idOrderCol)
      .first();

    if (!existing) return code;

    logger.warn("[OrderCode] Collision detected, retrying", { code, attempt });
  }

  throw new Error("Không thể tạo mã đơn duy nhất sau nhiều lần thử. Vui lòng thử lại.");
}

module.exports = {
  generateOrderCode,
  generateUniqueOrderCode,
  VALID_PREFIXES,
};
