const { safeIdent } = require("./utils");
const {
  TRANSACTION_CODE_REGEX_GLOBAL,
  normalizeTransactionCode,
} = require("../../src/services/transactionCodeService");
const { ORDER_TABLE, ORDER_COLS } = require("./config");

const MAV_ORDER_PREFIX_RE = /^MAV[A-Z0-9]{2,}/i;

const extractPaymentReferenceCandidates = (transaction) => {
  const fields = [
    transaction?.code,
    transaction?.transaction_content,
    transaction?.note,
    transaction?.description,
  ];
  const out = new Set();
  for (const field of fields) {
    if (!field) continue;
    const str = String(field).trim();
    const matches = str.match(TRANSACTION_CODE_REGEX_GLOBAL) || [];
    for (const raw of matches) {
      const normalized = normalizeTransactionCode(raw);
      if (!normalized) continue;
      if (MAV_ORDER_PREFIX_RE.test(normalized)) continue;
      out.add(normalized);
    }
  }
  return [...out];
};

/**
 * Map mã transaction (CK) → id_order để giữ nguyên luồng webhook theo mã MAV.
 * @returns {Promise<string[]>}
 */
async function resolveOrderCodesByTransaction(client, paymentReferenceCodes) {
  const normalized = [
    ...new Set(
      (paymentReferenceCodes || [])
        .map((code) => normalizeTransactionCode(code))
        .filter(Boolean)
    ),
  ];
  if (!normalized.length) return [];

  const txnCol = safeIdent(ORDER_COLS.transaction);
  const idOrderCol = safeIdent(ORDER_COLS.idOrder);
  const res = await client.query(
    `
      SELECT UPPER(TRIM(${idOrderCol}::text)) AS id_order
      FROM ${ORDER_TABLE}
      WHERE UPPER(TRIM(${txnCol}::text)) = ANY($1::text[])
        AND TRIM(${idOrderCol}::text) <> ''
    `,
    [normalized]
  );
  return [
    ...new Set(
      (res.rows || [])
        .map((row) => String(row?.id_order || "").trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
}

module.exports = {
  extractPaymentReferenceCandidates,
  resolveOrderCodesByTransaction,
};
