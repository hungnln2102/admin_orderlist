const express = require("express");
const {
  getMaintenanceStatus,
  updateMaintenanceStatus,
} = require("@/domains/site-maintenance/controller");

const router = express.Router();

router.get("/", getMaintenanceStatus);
router.put("/", updateMaintenanceStatus);

module.exports = router;
