const { db } = require("@/db");
const {
  ORDERS_SCHEMA,
  RECEIPT_SCHEMA,
  tableName,
  SCHEMA_ORDERS,
  SCHEMA_RECEIPT,
} = require("@/config/dbSchema");
const {
  generateTransactionCode,
  normalizeTransactionCode,
  TRANSACTION_CODE_LENGTH,
} = require("@/services/transactionCodeService");
const { generateCandidateBatchCode } = require("@/domains/payments/controller/shared/helpers");
const logger = require("@/utils/logger");

const MAX_RETRIES = 12;
const MAV_ORDER_PREFIX_RE = /^MAV[A-Z0-9]{2,}/i;
const LEGACY_BATCH_CODE_RE = /^MAVG[A-Z0-9]{4,20}$/i;

const ORDER_LIST_TABLE = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const ORDER_TRANSACTION_COL = ORDERS_SCHEMA.ORDER_LIST.COLS.TRANSACTION;
const BATCH_TABLE = tableName(RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH.TABLE, SCHEMA_RECEIPT);
const BATCH_CODE_COL = RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH.COLS.BATCH_CODE;

const isLegacyBatchTransferCode = (value) =>
  LEGACY_BATCH_CODE_RE.test(String(value || "").trim().toUpperCase());

/** Mã batch: MAVG… (chuẩn mới) hoặc 8 ký tự (legacy). */
const isBatchTransferCodeFormat = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return false;
  if (isLegacyBatchTransferCode(normalized)) return true;
  if (!normalizeTransactionCode(normalized)) return false;
  if (MAV_ORDER_PREFIX_RE.test(normalized)) return false;
  return normalized.length === TRANSACTION_CODE_LENGTH;
};

/**
 * Sinh mã MAVG… — đối chiếu nội bộ, không ghi nội dung CK.
 * @param {import("knex").Knex.Transaction|null} trx
 */
async function generateUniqueMavgBatchCode(trx = null) {
  const queryBuilder = trx || db;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const code = generateCandidateBatchCode();
    const batchHit = await queryBuilder(BATCH_TABLE)
      .whereRaw(`UPPER(TRIM(??::text)) = ?`, [BATCH_CODE_COL, code])
      .select(BATCH_CODE_COL)
      .first();

    if (!batchHit) return code;
    logger.warn("[BatchTransferCode] MAVG collision, retrying", { code, attempt });
  }

  throw new Error(
    "Không thể tạo mã MAVG batch duy nhất sau nhiều lần thử. Vui lòng thử lại."
  );
}

/** Legacy: mã 8 ký tự (batch cũ). */
async function generateUniqueBatchTransferCode(trx = null) {
  const queryBuilder = trx || db;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const code = generateTransactionCode();
    const [orderHit, batchHit] = await Promise.all([
      queryBuilder(ORDER_LIST_TABLE)
        .whereRaw(`UPPER(TRIM(??::text)) = ?`, [ORDER_TRANSACTION_COL, code])
        .select(ORDER_TRANSACTION_COL)
        .first(),
      queryBuilder(BATCH_TABLE)
        .whereRaw(`UPPER(TRIM(??::text)) = ?`, [BATCH_CODE_COL, code])
        .select(BATCH_CODE_COL)
        .first(),
    ]);

    if (!orderHit && !batchHit) return code;
    logger.warn("[BatchTransferCode] Collision detected, retrying", { code, attempt });
  }

  throw new Error(
    "Không thể tạo mã gộp CK duy nhất sau nhiều lần thử. Vui lòng thử lại."
  );
}

module.exports = {
  isLegacyBatchTransferCode,
  isBatchTransferCodeFormat,
  generateUniqueMavgBatchCode,
  generateUniqueBatchTransferCode,
};
