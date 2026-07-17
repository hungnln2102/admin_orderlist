const logger = require("@/utils/logger");
const {
  PAYMENT_RECEIPT_BATCH_TABLE,
  isMissingBatchTablesError,
} = require("./constants");
const {
  normalizeTransactionCode,
} = require("@/services/transactionCodeService");
const { isLegacyBatchTransferCode } = require("@/domains/payments/controller/shared/batchTransferCode");

/**
 * Từ các token 8 ký tự trong nội dung CK, tìm batch pending (mã gộp CK).
 * Legacy MAVG vẫn do parsePhase extract riêng.
 */
async function resolveBatchCodesByTransferTokens(client, tokens = []) {
  const legacy = [
    ...new Set(
      (tokens || [])
        .map((t) => String(t || "").trim().toUpperCase())
        .filter((t) => isLegacyBatchTransferCode(t))
    ),
  ];
  const transferCodes = [
    ...new Set(
      (tokens || [])
        .map((t) => normalizeTransactionCode(t))
        .filter(Boolean)
        .filter((t) => !isLegacyBatchTransferCode(t))
    ),
  ];

  const candidates = [...new Set([...legacy, ...transferCodes])];
  if (!candidates.length) return [];

  try {
    const result = await client.query(
      `
        SELECT UPPER(TRIM(batch_code::text)) AS batch_code
        FROM ${PAYMENT_RECEIPT_BATCH_TABLE}
        WHERE UPPER(TRIM(batch_code::text)) = ANY($1::text[])
          AND LOWER(COALESCE(status::text, 'pending')) <> 'cancelled'
      `,
      [candidates]
    );
    return [
      ...new Set(
        (result.rows || [])
          .map((row) => String(row?.batch_code || "").trim().toUpperCase())
          .filter(Boolean)
      ),
    ];
  } catch (error) {
    if (isMissingBatchTablesError(error)) {
      logger.warn("[Webhook] Skip batch lookup by transfer token: batch tables missing");
      return [];
    }
    throw error;
  }
}

module.exports = {
  resolveBatchCodesByTransferTokens,
};
