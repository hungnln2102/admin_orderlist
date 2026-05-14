const logger = require("../../utils/logger");
const { db } = require("../../db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  SCHEMA_ORDERS,
  ORDERS_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const { STATUS } = require("../../utils/statuses");

const TABLE = tableName(RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.TABLE, SCHEMA_RENEW_ADOBE);
const COLS = RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.COLS;
const ORDER_TABLE = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;
const PRODUCT_SYSTEM_TABLE = tableName(RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.TABLE, SCHEMA_RENEW_ADOBE);
const PRODUCT_SYSTEM_COLS = RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.COLS;

// Statuses coi là đơn còn hiệu lực → cần có trong mapping
const ACTIVE_STATUSES = [STATUS.PROCESSING, STATUS.PAID, STATUS.RENEWAL];
// system_code của Adobe
const ADOBE_SYSTEM_CODE = "renew_adobe";

module.exports = {
  logger,
  db,
  STATUS,
  TABLE,
  COLS,
  ORDER_TABLE,
  ORDER_COLS,
  PRODUCT_SYSTEM_TABLE,
  PRODUCT_SYSTEM_COLS,
  ACTIVE_STATUSES,
  ADOBE_SYSTEM_CODE,
};
