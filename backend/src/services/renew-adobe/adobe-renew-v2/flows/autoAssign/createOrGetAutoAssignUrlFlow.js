const { getOrCreateAutoAssignUrlWithPage } = require("@/services/renew-adobe/adobe-renew-v2/autoAssignFlow");

async function runCreateOrGetAutoAssignUrlFlow(
  page,
  orgId,
  email,
  password,
  options = {}
) {
  return getOrCreateAutoAssignUrlWithPage(page, orgId, email, password, options);
}

module.exports = {
  runCreateOrGetAutoAssignUrlFlow,
};
