/**
 * Entry mỏng cho assignment service.
 * Giữ nguyên API cũ để các nơi require("./assignmentService") không cần đổi.
 */

const { buildAvailableAccounts } = require("./assignmentService/availableAccounts");
const { assignUserToAvailableAccount } = require("./assignmentService/assignSingle");
const {
  fixUsersOneRoundTightest,
  fixUsersAllRoundsTightest,
} = require("./assignmentService/fixRounds");

module.exports = {
  buildAvailableAccounts,
  assignUserToAvailableAccount,
  fixUsersOneRoundTightest,
  fixUsersAllRoundsTightest,
};
