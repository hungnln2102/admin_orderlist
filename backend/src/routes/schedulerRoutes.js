const express = require("express");
const {
  runSchedulerNow,
  schedulerStatus,
} = require("../controllers/schedulerController");

const router = express.Router();

router.get("/run", runSchedulerNow);
router.get("/status", schedulerStatus);

module.exports = router;
