const { PAYMENT_RECEIPT_TABLE, PAYMENT_RECEIPT_COLS } = require("../../config");
const { SCHEMA_RECEIPT, RECEIPT_SCHEMA, tableName } = require("@/config/dbSchema");

const PAYMENT_RECEIPT_BASE_TABLE = PAYMENT_RECEIPT_TABLE.split(".").pop();
const PAYMENT_RECEIPT_TABLE_RESOLVED = tableName(PAYMENT_RECEIPT_BASE_TABLE, SCHEMA_RECEIPT);
const REFUND_CREDIT_APPLICATIONS_TABLE = tableName(
  RECEIPT_SCHEMA.REFUND_CREDIT_APPLICATIONS.TABLE,
  SCHEMA_RECEIPT
);
const PAYMENT_RECEIPT_BATCH_TABLE = tableName(
  RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH.TABLE,
  SCHEMA_RECEIPT
);
const PAYMENT_RECEIPT_BATCH_ITEM_TABLE = tableName(
  RECEIPT_SCHEMA.PAYMENT_RECEIPT_BATCH_ITEM.TABLE,
  SCHEMA_RECEIPT
);

const BATCH_CODE_REGEX = /\bMAVG[A-Z0-9]{4,20}\b/gi;
const isBatchCode = (value) => /^MAVG[A-Z0-9]{4,20}$/i.test(String(value || "").trim());

const hasMissingTableError = (error, tableNameValue) =>
  error?.code === "42P01" &&
  String(error?.message || "")
    .toLowerCase()
    .includes(String(tableNameValue || "").toLowerCase());

const isMissingBatchTablesError = (error) =>
  hasMissingTableError(error, "payment_receipt_batch") ||
  hasMissingTableError(error, "payment_receipt_batch_item");

module.exports = {
  PAYMENT_RECEIPT_COLS,
  PAYMENT_RECEIPT_TABLE_RESOLVED,
  REFUND_CREDIT_APPLICATIONS_TABLE,
  PAYMENT_RECEIPT_BATCH_TABLE,
  PAYMENT_RECEIPT_BATCH_ITEM_TABLE,
  BATCH_CODE_REGEX,
  isBatchCode,
  isMissingBatchTablesError,
};
