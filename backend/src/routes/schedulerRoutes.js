const express = require("express");
const {
  runSchedulerNow,
  schedulerStatus,
} = require("../controllers/SchedulerController");

const router = express.Router();

router.get("/run", runSchedulerNow);
router.get("/status", schedulerStatus);

module.exports = router;
