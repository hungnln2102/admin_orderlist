const express = require("express");
const { listAccounts, runCheck } = require("../controllers/RenewAdobeController");

const router = express.Router();

router.get("/accounts", listAccounts);
router.post("/accounts/:id/check", runCheck);

module.exports = router;
