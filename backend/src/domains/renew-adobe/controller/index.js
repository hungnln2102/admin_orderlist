const {
  listMailBackupMailboxes,
  createMailBackupMailbox,
  listAccounts,
  lookupAccountByEmail,
  createAccount,
  deleteAccount,
  updateUrlAccess,
  updateAccount,
} = require("@/domains/renew-adobe/controller/accounts");
const {
  runCheckForAccountId,
  runCheck,
  runCheckWithCookies,
} = require("@/domains/renew-adobe/controller/checkAccounts");
const {
  runAddUsersBatch,
  runAutoDeleteUsers: runAutoDeleteUsersHandler,
} = require("@/domains/renew-adobe/controller/batchUsers");
const {
  adobeQueueStatus,
  checkAllAccounts: checkAllAccountsHandler,
  autoAssignUsers,
  runAutoAssign,
  fixSingleUser,
  fixUsersRound,
} = require("@/domains/renew-adobe/controller/autoAssign");
const {
  listVariants,
  listProductSystem,
  createProductSystem,
  deleteProductSystem,
} = require("@/domains/renew-adobe/controller/productSystem");
const { listUserOrders } = require("@/domains/renew-adobe/controller/userOrders");
const {
  listMatchableOrders,
  addOrdersToTracking,
  updateTrackingOrder,
  deleteTrackingOrder,
} = require("@/domains/renew-adobe/controller/userOrdersAddTracking");
const {
  getWebsiteStatus,
  activateWebsiteUser,
} = require("@/domains/renew-adobe/controller/publicWebsite");
const { listSystemLogs } = require("@/domains/renew-adobe/controller/systemLogs");

const runAutoDeleteUsers = (req, res) =>
  runAutoDeleteUsersHandler({
    req,
    res,
    runCheckForAccountId,
  });
const checkAllAccounts = (req, res) =>
  checkAllAccountsHandler({
    req,
    res,
    runCheckForAccountId,
  });

module.exports = {
  listMailBackupMailboxes,
  createMailBackupMailbox,
  listAccounts,
  lookupAccountByEmail,
  createAccount,
  deleteAccount,
  runCheck,
  runCheckForAccountId,
  runCheckWithCookies,
  runAddUsersBatch,
  runAutoDeleteUsers,
  adobeQueueStatus,
  checkAllAccounts,
  listUserOrders,
  listMatchableOrders,
  addOrdersToTracking,
  updateTrackingOrder,
  deleteTrackingOrder,
  autoAssignUsers,
  runAutoAssign,
  fixSingleUser,
  fixUsersRound,
  updateUrlAccess,
  updateAccount,
  listVariants,
  listProductSystem,
  createProductSystem,
  deleteProductSystem,
  getWebsiteStatus,
  activateWebsiteUser,
  listSystemLogs,
};
