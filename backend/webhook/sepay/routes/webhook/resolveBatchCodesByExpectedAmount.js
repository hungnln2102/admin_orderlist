const logger = require("../../../../src/utils/logger");
const {
  PAYMENT_RECEIPT_BATCH_TABLE,
  isMissingBatchTablesError,
} = require("./constants");

/**
 * Tra batch pending theo tổng tiền CK — dùng khi khách không ghi nội dung.
 * Chỉ trả về khi khớp đúng 1 batch pending (tránh nhầm).
 */
async function resolveBatchCodesByExpectedAmount(client, { amount }) {
  const normalized = Math.round(Number(amount));
  if (!(normalized > 0)) return [];

  try {
    const result = await client.query(
      `
        SELECT UPPER(TRIM(batch_code::text)) AS batch_code
        FROM ${PAYMENT_RECEIPT_BATCH_TABLE}
        WHERE LOWER(COALESCE(status::text, 'pending')) = 'pending'
          AND ROUND(total_amount::numeric) = $1
        ORDER BY created_at DESC
        LIMIT 5
      `,
      [normalized]
    );
    const codes = [
      ...new Set(
        (result.rows || [])
          .map((row) => String(row?.batch_code || "").trim().toUpperCase())
          .filter(Boolean)
      ),
    ];
    if (codes.length === 1) return codes;
    if (codes.length > 1) {
      logger.warn("[Webhook] Multiple pending batches for same total amount", {
        amount: normalized,
        batchCodes: codes,
      });
    }
    return [];
  } catch (error) {
    if (isMissingBatchTablesError(error)) {
      logger.warn("[Webhook] Skip batch lookup by amount: batch tables missing");
      return [];
    }
    throw error;
  }
}

module.exports = {
  resolveBatchCodesByExpectedAmount,
};
