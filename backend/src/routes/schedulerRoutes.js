const express = require("express");
const {
  runSchedulerNow,
  schedulerStatus,
  runFourDaysNotificationNow,
  runCleanupExpiredAdobeUsersNow,
  runRenewAdobeCheckNow,
} = require("../controllers/SchedulerController");

const router = express.Router();

router.get("/run", runSchedulerNow);
router.get("/run-due-notification", runFourDaysNotificationNow);
router.get("/run-cleanup-adobe", runCleanupExpiredAdobeUsersNow);
router.get("/run-adobe-check", runRenewAdobeCheckNow);
router.get("/status", schedulerStatus);

module.exports = router;
