const express = require("express");
const router = express.Router();
const systemConfigService = require("./services/systemConfigService");
const cronJobService = require("./services/cronJobService");
const scheduler = require("@/scheduler");
const { getClientErrorMessage } = require("@/utils/clientError");

// GET /api/system/configs - Lấy toàn bộ cấu hình hệ thống
router.get("/configs", async (req, res) => {
  try {
    const configs = await systemConfigService.getAllConfigs();
    res.json(configs);
  } catch (err) {
    console.error("[System API] Lỗi lấy danh sách cấu hình:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy cấu hình." });
  }
});

// PUT /api/system/configs/:key - Cập nhật 1 cấu hình
router.put("/configs/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    const updatedBy = req.session?.user?.username || "ADMIN";

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "Thiếu giá trị 'value' cần cập nhật." });
    }

    const updated = await systemConfigService.set(key, value, updatedBy);
    res.json(updated);
  } catch (err) {
    console.error(`[System API] Lỗi cập nhật cấu hình ${req.params.key}:`, err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể cập nhật cấu hình.") });
  }
});

// GET /api/system/notification-logs - Lấy lịch sử thông báo
router.get("/notification-logs", async (req, res) => {
  try {
    const { page, limit, status, channel } = req.query;
    const result = await systemConfigService.getNotificationLogs({ page, limit, status, channel });
    res.json(result);
  } catch (err) {
    console.error("[System API] Lỗi lấy lịch sử thông báo:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy lịch sử thông báo." });
  }
});

router.get("/cron-jobs", async (req, res) => {
  try {
    res.json(await cronJobService.listJobs(scheduler.getNextRunTime));
  } catch (err) {
    console.error("[System API] Lỗi lấy lịch tác vụ:", err);
    res.status(500).json({ error: "Không thể tải lịch tác vụ." });
  }
});

router.put("/cron-jobs/:id", async (req, res) => {
  try {
    const job = await cronJobService.updateJob(req.params.id, req.body || {});
    await scheduler.refreshJob(job.id);
    res.json((await cronJobService.listJobs(scheduler.getNextRunTime)).find((item) => item.id === job.id));
  } catch (err) {
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể cập nhật lịch tác vụ.") });
  }
});

router.post("/cron-jobs/:id/run-now", async (req, res) => {
  try {
    const result = await scheduler.runJobNow(req.params.id);
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể chạy tác vụ.") });
  }
});

router.post("/cron-jobs", async (req, res) => {
  try {
    const job = await cronJobService.createJob(req.body || {});
    res.status(201).json(cronJobService.toDto(job, null, null));
  } catch (err) {
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể tạo tác vụ.") });
  }
});

router.get("/cron-jobs/:id/logs", async (req, res) => {
  try {
    res.json(await cronJobService.listLogs(req.params.id));
  } catch (err) {
    res.status(404).json({ error: getClientErrorMessage(err, "Không tìm thấy lịch sử tác vụ.") });
  }
});

module.exports = router;
