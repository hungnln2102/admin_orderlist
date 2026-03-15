/**
 * Adobe Renew V2 — Hệ thống mới theo luồng B1–B13 + B14 auto-assign (doc: Renew_Adobe_V2_Flow.md).
 */

const { runCheckFlow, toPwCookies, fromPwCookies } = require("./runCheckFlow");
const { getOrCreateAutoAssignUrlWithPage } = require("./autoAssignFlow");
const { doFormLoginOnAuthPage } = require("./loginFlow");
const { runB15RemoveProductFromAdmin } = require("./removeProductAdminFlow");
const { gotoUsersPageWithCurrentSession, deleteUsersWithExistingPage, scrapeUsersSnapshot } = require("./userDeleteActions");
const { deleteUsersV2 } = require("./deleteUsersV2");

module.exports = {
  runCheckFlow,
  toPwCookies,
  fromPwCookies,
  getOrCreateAutoAssignUrlWithPage,
  doFormLoginOnAuthPage,
  runB15RemoveProductFromAdmin,
  gotoUsersPageWithCurrentSession,
  deleteUsersWithExistingPage,
  scrapeUsersSnapshot,
  deleteUsersV2,
};
