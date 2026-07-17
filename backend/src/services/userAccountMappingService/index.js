const { syncOrdersToMapping } = require("@/services/userAccountMappingService/syncOrders");
const {
  lookupAndRecordIfNeeded,
  syncRenewAdobeMappingFromTeamMembers,
  clearRenewAdobeMappingForEmailsNotOnTeam,
} = require("@/services/userAccountMappingService/teamSync");
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
} = require("@/services/userAccountMappingService/mappingCrud");

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
