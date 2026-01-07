const { DB_SCHEMA, tableName } = require("../../config/dbSchema");
const { createYearExtraction } = require("../../utils/sql");

const ORDER_DEF = DB_SCHEMA.ORDER_LIST;
const PAYMENT_RECEIPT_DEF = DB_SCHEMA.PAYMENT_RECEIPT;

const TABLES = {
  orderList: tableName(ORDER_DEF.TABLE),
  orderExpired: tableName(DB_SCHEMA.ORDER_EXPIRED.TABLE),
  orderCanceled: tableName(DB_SCHEMA.ORDER_CANCELED.TABLE),
  paymentReceipt: tableName(PAYMENT_RECEIPT_DEF.TABLE),
};

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const timezoneCandidate =
  typeof process.env.APP_TIMEZONE === "string" &&
  /^[A-Za-z0-9_\/+\-]+$/.test(process.env.APP_TIMEZONE)
    ? process.env.APP_TIMEZONE
    : DEFAULT_TIMEZONE;

const CURRENT_DATE_SQL = `(CURRENT_TIMESTAMP AT TIME ZONE '${timezoneCandidate}')::date`;
const normalizedYearCase = createYearExtraction("raw_date");

module.exports = {
  ORDER_DEF,
  PAYMENT_RECEIPT_DEF,
  TABLES,
  DEFAULT_TIMEZONE,
  timezoneCandidate,
  CURRENT_DATE_SQL,
  normalizedYearCase,
};
