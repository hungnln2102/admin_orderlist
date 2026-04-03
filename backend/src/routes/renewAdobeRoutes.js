const express = require("express");
const { listMailBackupMailboxes, createMailBackupMailbox, listAccounts, lookupAccountByEmail, createAccount, runCheck, runCheckWithCookies, runAddUsersBatch, runAutoDeleteUsers, adobeQueueStatus, checkAllAccounts, listUserOrders, runAutoAssign, fixSingleUser, updateUrlAccess, listVariants, listProductSystem, createProductSystem, deleteProductSystem } = require("../controllers/RenewAdobeController");

const router = express.Router();

router.get("/queue-status", adobeQueueStatus);
router.get("/mail-backup-mailboxes", listMailBackupMailboxes);
router.post("/mail-backup-mailboxes", createMailBackupMailbox);
router.get("/accounts", listAccounts);
router.post("/accounts", createAccount);
router.get("/accounts/lookup", lookupAccountByEmail);
router.get("/accounts/check-all", checkAllAccounts);
router.get("/user-orders", listUserOrders);
router.post("/check-with-cookies", runCheckWithCookies);
router.post("/accounts/:id/check", runCheck);
router.post("/accounts/add-users-batch", runAddUsersBatch);
router.post("/accounts/:id/auto-delete-users", runAutoDeleteUsers);
router.post("/auto-assign", runAutoAssign);
router.post("/fix-user", fixSingleUser);
router.patch("/accounts/:id/url-access", updateUrlAccess);

router.get("/variants", listVariants);
router.get("/product-system", listProductSystem);
router.post("/product-system", createProductSystem);
router.delete("/product-system/:id", deleteProductSystem);

module.exports = router;
