/**
 * Entry mỏng cho orderUserTrackingService.
 * Giữ nguyên API để không đổi các require hiện tại.
 */

const {
  upsertRenewAdobeOrderUserTrackingForOrderIds,
  upsertRenewAdobeOrderUserTrackingForAccount,
  syncAllRenewAdobeOrderUserTracking,
} = require("./orderUserTrackingService/upsert");
const {
  reconcileOrderUserTrackingWithTeamMembers,
} = require("./orderUserTrackingService/reconcile");
const {
  getOrderUserTrackingCountsForAdminAccounts,
  getOrderUserTrackingCountByOrgName,
} = require("./orderUserTrackingService/counts");
const { normalizeOrgKeyForTracking } = require("./orderUserTrackingService/helpers");
const {
  getMapAccountIdToUserEmailsForTrackingExpiredToday,
  getMapAccountIdToUserEmailsFor2330Cleanup,
} = require("./orderUserTrackingService/cleanupMaps");

module.exports = {
  upsertRenewAdobeOrderUserTrackingForOrderIds,
  upsertRenewAdobeOrderUserTrackingForAccount,
  reconcileOrderUserTrackingWithTeamMembers,
  syncAllRenewAdobeOrderUserTracking,
  getOrderUserTrackingCountsForAdminAccounts,
  normalizeOrgKeyForTracking,
  getOrderUserTrackingCountByOrgName,
  getMapAccountIdToUserEmailsForTrackingExpiredToday,
  getMapAccountIdToUserEmailsFor2330Cleanup,
};
