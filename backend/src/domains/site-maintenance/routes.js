const express = require("express");
const {
  getMaintenanceStatus,
  updateMaintenanceStatus,
} = require("./controller");

const router = express.Router();

router.get("/", getMaintenanceStatus);
router.put("/", updateMaintenanceStatus);

module.exports = router;
