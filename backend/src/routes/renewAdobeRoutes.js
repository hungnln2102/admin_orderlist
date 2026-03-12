const express = require("express");
const { listAccounts, lookupAccountByEmail, runCheck, runCheckWithCookies, runDeleteUser, runAddUser, runAddUsersBatch, runAutoDeleteUsers, adobeQueueStatus, checkAllAccounts, listUserOrders, runAutoAssign, fixSingleUser, updateUrlAccess } = require("../controllers/RenewAdobeController");

const router = express.Router();

router.get("/queue-status", adobeQueueStatus);
router.get("/accounts", listAccounts);
router.get("/accounts/lookup", lookupAccountByEmail);
router.get("/accounts/check-all", checkAllAccounts);
router.get("/user-orders", listUserOrders);
router.post("/check-with-cookies", runCheckWithCookies);
router.post("/accounts/:id/check", runCheck);
router.post("/accounts/:id/delete-user", runDeleteUser);
router.post("/accounts/:id/add-user", runAddUser);
router.post("/accounts/add-users-batch", runAddUsersBatch);
router.post("/accounts/:id/auto-delete-users", runAutoDeleteUsers);
router.post("/auto-assign", runAutoAssign);
router.post("/fix-user", fixSingleUser);
router.patch("/accounts/:id/url-access", updateUrlAccess);

module.exports = router;
