const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../../config/dbSchema");
const {
  TBL_ORDER,
  ORD_COLS,
  getRenewAdobeVariantIds,
} = require("../../../controllers/RenewAdobeController/orderAccess");

const TRACK_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const TRACK_COLS = RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.COLS;

const MAP_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const MAP_COLS = RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.COLS;

const ACC_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.ACCOUNT.TABLE,
  SCHEMA_RENEW_ADOBE
);
const ACC_COLS = RENEW_ADOBE_SCHEMA.ACCOUNT.COLS;

module.exports = {
  TBL_ORDER,
  ORD_COLS,
  getRenewAdobeVariantIds,
  TRACK_TABLE,
  TRACK_COLS,
  MAP_TABLE,
  MAP_COLS,
  ACC_TABLE,
  ACC_COLS,
};
