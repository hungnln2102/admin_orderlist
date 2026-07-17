require("@/services/renew-adobe/adobe-renew-v2/flows/users/contracts");

const { runGotoUsersFlow } = require("@/services/renew-adobe/adobe-renew-v2/flows/users/gotoUsersFlow");
const { runCheckAdminProductFlow } = require("@/services/renew-adobe/adobe-renew-v2/flows/users/checkAdminProductFlow");
const { runRemoveAdminProductFlow } = require("@/services/renew-adobe/adobe-renew-v2/flows/users/removeAdminProductFlow");
const { runDeleteUsersFlow } = require("@/services/renew-adobe/adobe-renew-v2/flows/users/deleteUsersFlow");
const { runAddUsersFlow } = require("@/services/renew-adobe/adobe-renew-v2/flows/users/addUsersFlow");
const {
  runUsersSnapshotFlow,
  runPersistUsersSessionFlow,
} = require("@/services/renew-adobe/adobe-renew-v2/flows/users/snapshotFlow");

module.exports = {
  runGotoUsersFlow,
  runCheckAdminProductFlow,
  runRemoveAdminProductFlow,
  runDeleteUsersFlow,
  runAddUsersFlow,
  runUsersSnapshotFlow,
  runPersistUsersSessionFlow,
};
