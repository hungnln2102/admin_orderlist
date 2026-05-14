const { db } = require("../../../db");
const logger = require("../../../utils/logger");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../../config/dbSchema");
const { TABLE, COLS, MAX_USERS_PER_ACCOUNT } = require("../accountTable");
const MAP_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const MAP_COLS = RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING.COLS;
const {
  buildAvailableAccounts,
  assignUserToAvailableAccount,
  fixUsersAllRoundsTightest,
} = require("../assignmentService");
const {
  TBL_ORDER,
  ORD_COLS,
  ALLOWED_ORDER_STATUSES,
  getRenewAdobeVariantIds,
} = require("../orderAccess");
const {
  upsertRenewAdobeOrderUserTrackingForAccount,
  getOrderUserTrackingCountByOrgName,
} = require("../../../services/renew-adobe/orderUserTrackingService");

function logAutoAssign(onProgress, data) {
  if (onProgress) {
    onProgress(data);
  }
  logger.info("[renew-adobe] autoAssign: %s", JSON.stringify(data));
}

function fixUserExpectableErrorMessage(msg) {
  const s = String(msg || "");
  return (
    s.includes("đầy slot") ||
    s.includes("hết slot") ||
    s.includes("Không có tài khoản nào còn gói và còn slot")
  );
}

module.exports = {
  db,
  logger,
  TABLE,
  COLS,
  MAX_USERS_PER_ACCOUNT,
  MAP_TABLE,
  MAP_COLS,
  buildAvailableAccounts,
  assignUserToAvailableAccount,
  fixUsersAllRoundsTightest,
  TBL_ORDER,
  ORD_COLS,
  ALLOWED_ORDER_STATUSES,
  getRenewAdobeVariantIds,
  upsertRenewAdobeOrderUserTrackingForAccount,
  getOrderUserTrackingCountByOrgName,
  logAutoAssign,
  fixUserExpectableErrorMessage,
};
