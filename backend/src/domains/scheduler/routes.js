const express = require("express");
const {
  runSchedulerNow,
  schedulerStatus,
  runFourDaysNotificationNow,
  runCleanupExpiredAdobeUsersNow,
  runCleanupAdobeProfileGarbageNow,
  runRenewAdobeCheckNow,
  runSyncMappingNow,
  runDailyRevenueSummaryNow,
} = require("../../controllers/SchedulerController");

const router = express.Router();

router.get("/run", runSchedulerNow);
router.get("/run-due-notification", runFourDaysNotificationNow);
router.get("/run-cleanup-adobe", runCleanupExpiredAdobeUsersNow);
router.get("/run-cleanup-adobe-profiles", runCleanupAdobeProfileGarbageNow);
router.get("/run-adobe-check", runRenewAdobeCheckNow);
router.get("/run-sync-mapping", runSyncMappingNow);
router.get("/run-daily-revenue-summary", runDailyRevenueSummaryNow);
router.get("/status", schedulerStatus);

module.exports = router;
