/**
 * Entry mỏng cho auto-assign / check-all luồng Renew Adobe.
 * Giữ nguyên export contract cho routes + scheduler tasks.
 */

const { autoAssignUsers, runAutoAssign } = require("./autoAssign/autoAssignUsers");
const { fixSingleUser, fixUsersRound, adobeQueueStatus } = require("./autoAssign/fixHandlers");
const { runCheckAllAccountsFlow, checkAllAccounts } = require("./autoAssign/checkAllFlow");

module.exports = {
  adobeQueueStatus,
  checkAllAccounts,
  runCheckAllAccountsFlow,
  autoAssignUsers,
  runAutoAssign,
  fixSingleUser,
  fixUsersRound,
};
