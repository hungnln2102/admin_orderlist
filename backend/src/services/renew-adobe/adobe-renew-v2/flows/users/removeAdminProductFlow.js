const { runB15RemoveProductFromAdmin } = require("@/services/renew-adobe/adobe-renew-v2/removeProductAdminFlow");

async function runRemoveAdminProductFlow(page, adminEmail, options = {}) {
  return runB15RemoveProductFromAdmin(page, adminEmail, options);
}

module.exports = {
  runRemoveAdminProductFlow,
};
