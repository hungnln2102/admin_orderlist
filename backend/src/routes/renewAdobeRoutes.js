const express = require("express");
const { listAccounts, lookupAccountByEmail, runCheck, runCheckWithCookies, runDeleteUser } = require("../controllers/RenewAdobeController");

const router = express.Router();

router.get("/accounts", listAccounts);
router.get("/accounts/lookup", lookupAccountByEmail);
router.post("/check-with-cookies", runCheckWithCookies);
router.post("/accounts/:id/check", runCheck);
router.post("/accounts/:id/delete-user", runDeleteUser);

module.exports = router;
