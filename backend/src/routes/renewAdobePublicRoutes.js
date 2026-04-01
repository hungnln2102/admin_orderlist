const express = require("express");
const {
  getWebsiteStatus,
  activateWebsiteUser,
} = require("../controllers/RenewAdobeController");

const router = express.Router();

router.get("/status", getWebsiteStatus);
router.post("/activate", activateWebsiteUser);

module.exports = router;
