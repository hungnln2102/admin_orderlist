const { syncOrdersToMapping } = require("./syncOrders");
const {
  lookupAndRecordIfNeeded,
  syncRenewAdobeMappingFromTeamMembers,
  clearRenewAdobeMappingForEmailsNotOnTeam,
} = require("./teamSync");
const {
  recordUsersAssigned,
  removeMappingsForAccount,
  removeMappingsByOrders,
  getMappingsForAccount,
  getAccountForUser,
  markUsersProductFalseByAccount,
  getAssignedAdobeAccountIdForUserEmail,
  getEmailSetAlreadyAssignedToAdobe,
  getMappingCountsByAdobeAccountIds,
} = require("./mappingCrud");

module.exports = {
  syncOrdersToMapping,
  syncRenewAdobeMappingFromTeamMembers,
  clearRenewAdobeMappingForEmailsNotOnTeam,
  lookupAndRecordIfNeeded,
  markUsersProductFalseByAccount,
  recordUsersAssigned,
  removeMappingsForAccount,
  removeMappingsByOrders,
  getMappingsForAccount,
  getAccountForUser,
  getAssignedAdobeAccountIdForUserEmail,
  getEmailSetAlreadyAssignedToAdobe,
  getMappingCountsByAdobeAccountIds,
};
