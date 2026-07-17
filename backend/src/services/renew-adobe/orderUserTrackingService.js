/**
 * Entry mỏng cho orderUserTrackingService.
 * Giữ nguyên API để không đổi các require hiện tại.
 */

const {
  upsertRenewAdobeOrderUserTrackingForOrderIds,
  upsertRenewAdobeOrderUserTrackingForAccount,
  syncAllRenewAdobeOrderUserTracking,
} = require("@/services/renew-adobe/orderUserTrackingService/upsert");
const {
  reconcileOrderUserTrackingWithTeamMembers,
} = require("@/services/renew-adobe/orderUserTrackingService/reconcile");
const {
  getOrderUserTrackingCountsForAdminAccounts,
  getOrderUserTrackingCountByOrgName,
} = require("@/services/renew-adobe/orderUserTrackingService/counts");
const { normalizeOrgKeyForTracking } = require("@/services/renew-adobe/orderUserTrackingService/helpers");
const {
  getMapAccountIdToUserEmailsForTrackingExpiredToday,
  getMapAccountIdToUserEmailsFor2330Cleanup,
} = require("@/services/renew-adobe/orderUserTrackingService/cleanupMaps");

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
