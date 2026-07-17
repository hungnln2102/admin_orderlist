/**
 * Entry mỏng cho auto-assign / check-all luồng Renew Adobe.
 * Giữ nguyên export contract cho routes + scheduler tasks.
 */

const { autoAssignUsers, runAutoAssign } = require("@/domains/renew-adobe/controller/autoAssign/autoAssignUsers");
const { fixSingleUser, fixUsersRound, adobeQueueStatus } = require("@/domains/renew-adobe/controller/autoAssign/fixHandlers");
const { runCheckAllAccountsFlow, checkAllAccounts } = require("@/domains/renew-adobe/controller/autoAssign/checkAllFlow");

module.exports = {
  adobeQueueStatus,
  checkAllAccounts,
  runCheckAllAccountsFlow,
  autoAssignUsers,
  runAutoAssign,
  fixSingleUser,
  fixUsersRound,
};
