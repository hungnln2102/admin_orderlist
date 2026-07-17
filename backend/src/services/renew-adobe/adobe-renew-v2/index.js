/**
 * Adobe Renew V2 — Hệ thống mới theo luồng B1–B13 + B14 auto-assign (doc: Renew_Adobe_V2_Flow.md).
 */

const { runCheckFlow, toPwCookies, fromPwCookies } = require("@/services/renew-adobe/adobe-renew-v2/runCheckFlow");
const { getOrCreateAutoAssignUrlWithPage } = require("@/services/renew-adobe/adobe-renew-v2/autoAssignFlow");
const { doFormLoginOnAuthPage } = require("@/services/renew-adobe/adobe-renew-v2/loginFlow");
const { runB15RemoveProductFromAdmin } = require("@/services/renew-adobe/adobe-renew-v2/removeProductAdminFlow");
const { deleteUsersV2 } = require("@/services/renew-adobe/adobe-renew-v2/deleteUsersV2");
const { addUsersWithProductV2 } = require("@/services/renew-adobe/adobe-renew-v2/addUsersWithProductV2");
const flows = require("@/services/renew-adobe/adobe-renew-v2/flows");
const facade = require("@/services/renew-adobe/adobe-renew-v2/facade");

module.exports = {
  runCheckFlow,
  toPwCookies,
  fromPwCookies,
  getOrCreateAutoAssignUrlWithPage,
  doFormLoginOnAuthPage,
  runB15RemoveProductFromAdmin,
  deleteUsersV2,
  addUsersWithProductV2,
  flows,
  checkAccount: facade.checkAccount,
  addUsersWithProduct: facade.addUsersWithProduct,
  removeUserFromAccount: facade.removeUserFromAccount,
  autoDeleteUsers: facade.autoDeleteUsers,
};
