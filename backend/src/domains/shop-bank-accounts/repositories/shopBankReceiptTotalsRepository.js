const db = require("@/db/knexClient");
const {
  RECEIPT_SCHEMA,
  SCHEMA_RECEIPT,
  tableName,
} = require("@/config/dbSchema");
const { normalizeAccountNumber } = require("@/domains/shop-bank-accounts/helpers/shopBankInputs");

const PAYMENT_RECEIPT_TABLE = tableName(
  RECEIPT_SCHEMA.PAYMENT_RECEIPT.TABLE,
  SCHEMA_RECEIPT
);
const RECEIVER_COL = RECEIPT_SCHEMA.PAYMENT_RECEIPT.COLS.RECEIVER;
const AMOUNT_COL = RECEIPT_SCHEMA.PAYMENT_RECEIPT.COLS.AMOUNT;


/**
 * Tổng tiền CK Sepay vào từng STK (theo payment_receipt.receiver).
 * @returns {Promise<Map<string, number>>} Map normalized STK → tổng VND
 */
const sumReceivedByReceiver = async () => {
  const rows = await db(PAYMENT_RECEIPT_TABLE)
    .select(db.raw("TRIM(??) AS receiver", [RECEIVER_COL]))
    .sum({ total: AMOUNT_COL })
    .whereRaw(`COALESCE(TRIM(??::text), '') <> ''`, [RECEIVER_COL])
    .groupByRaw("TRIM(??)", [RECEIVER_COL]);

  const totals = new Map();
  for (const row of rows || []) {
    const key = normalizeAccountNumber(row?.receiver);
    if (!key) continue;
    const amount = Number(row?.total) || 0;
    totals.set(key, (totals.get(key) || 0) + amount);
  }
  return totals;
};

module.exports = {
  sumReceivedByReceiver,
};
