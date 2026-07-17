const logger = require("@/utils/logger");
const {
  PAYMENT_RECEIPT_BATCH_ITEM_TABLE,
  PAYMENT_RECEIPT_BATCH_TABLE,
  isMissingBatchTablesError,
} = require("./constants");

const resolveOrderCodesByBatchCodes = async (client, batchCodes) => {
  const normalized = [
    ...new Set((batchCodes || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean)),
  ];
  if (normalized.length === 0) return new Map();
  const sql = `
    SELECT
      UPPER(COALESCE(i.batch_code::text, '')) AS batch_code,
      UPPER(COALESCE(i.order_code::text, '')) AS order_code
    FROM ${PAYMENT_RECEIPT_BATCH_ITEM_TABLE} i
    INNER JOIN ${PAYMENT_RECEIPT_BATCH_TABLE} b
      ON b.id = i.batch_id
    WHERE UPPER(COALESCE(i.batch_code::text, '')) = ANY($1::text[])
      AND TRIM(COALESCE(i.order_code::text, '')) <> ''
      AND LOWER(COALESCE(b.status::text, 'pending')) <> 'cancelled'
    ORDER BY i.id ASC
  `;
  let rows = [];
  try {
    const result = await client.query(sql, [normalized]);
    rows = result.rows || [];
  } catch (error) {
    if (isMissingBatchTablesError(error)) {
      logger.warn("[Webhook] Skip batch-code expansion: batch tables missing");
      return new Map();
    }
    throw error;
  }
  const map = new Map();
  for (const row of rows) {
    const batch = String(row?.batch_code || "").trim().toUpperCase();
    const orderCode = String(row?.order_code || "").trim().toUpperCase();
    if (!batch || !orderCode) continue;
    const list = map.get(batch) || [];
    if (!list.includes(orderCode)) list.push(orderCode);
    map.set(batch, list);
  }
  return map;
};

/**
 * Map order_code -> tổng amount của batch item cho các mã MAVG.
 * Dùng để phân bổ đúng tiền webhook theo từng order trong batch.
 */
const resolveBatchOrderAmountsByBatchCodes = async (client, batchCodes, normalizeMoney) => {
  const normalized = [
    ...new Set((batchCodes || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean)),
  ];
  if (normalized.length === 0) return new Map();
  const sql = `
    SELECT
      UPPER(COALESCE(i.order_code::text, '')) AS order_code,
      COALESCE(SUM(i.amount::numeric), 0) AS total_amount
    FROM ${PAYMENT_RECEIPT_BATCH_ITEM_TABLE} i
    INNER JOIN ${PAYMENT_RECEIPT_BATCH_TABLE} b
      ON b.id = i.batch_id
    WHERE UPPER(COALESCE(i.batch_code::text, '')) = ANY($1::text[])
      AND TRIM(COALESCE(i.order_code::text, '')) <> ''
      AND LOWER(COALESCE(b.status::text, 'pending')) <> 'cancelled'
    GROUP BY UPPER(COALESCE(i.order_code::text, ''))
  `;
  let rows = [];
  try {
    const result = await client.query(sql, [normalized]);
    rows = result.rows || [];
  } catch (error) {
    if (isMissingBatchTablesError(error)) {
      logger.warn("[Webhook] Skip batch amount expansion: batch tables missing");
      return new Map();
    }
    throw error;
  }
  const map = new Map();
  for (const row of rows) {
    const orderCode = String(row?.order_code || "").trim().toUpperCase();
    if (!orderCode) continue;
    map.set(orderCode, Math.max(0, normalizeMoney(row?.total_amount)));
  }
  return map;
};

module.exports = {
  resolveOrderCodesByBatchCodes,
  resolveBatchOrderAmountsByBatchCodes,
};
