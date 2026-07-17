/**
 * Entry mỏng cho assignment service.
 * Giữ nguyên API cũ để các nơi require("@/domains/renew-adobe/controller/assignmentService") không cần đổi.
 */

const { buildAvailableAccounts } = require("@/domains/renew-adobe/controller/assignmentService/availableAccounts");
const { assignUserToAvailableAccount } = require("@/domains/renew-adobe/controller/assignmentService/assignSingle");
const {
  fixUsersOneRoundTightest,
  fixUsersAllRoundsTightest,
} = require("@/domains/renew-adobe/controller/assignmentService/fixRounds");

module.exports = {
  buildAvailableAccounts,
  assignUserToAvailableAccount,
  fixUsersOneRoundTightest,
  fixUsersAllRoundsTightest,
};
