const express = require("express");
const router = express.Router();
const systemConfigService = require("./services/systemConfigService");
const cronJobService = require("./services/cronJobService");
const systemLogService = require("./services/systemLogService");
const externalApiConfigService = require("./services/externalApiConfigService");
const otpProviderService = require("./services/otpProviderService");
const { requireAdmin } = require("@/domains/auth/middleware/requireAdmin");
const { sensitiveOperationRateLimiter } = require("./middleware/sensitiveOperationRateLimiter");
const scheduler = require("@/scheduler");
const { getClientErrorMessage } = require("@/utils/clientError");

router.use(requireAdmin);

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

// GET /api/system/audit-logs - Lấy danh sách nhật ký hoạt động hệ thống
router.get("/audit-logs", async (req, res) => {
  try {
    const result = await systemLogService.getAuditLogs(req.query);
    res.json(result);
  } catch (err) {
    console.error("[System Audit API] Lỗi lấy danh sách nhật ký:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi tải nhật ký hoạt động." });
  }
});

// GET /api/system/audit-logs/stats - Lấy thống kê nhật ký
router.get("/audit-logs/stats", async (req, res) => {
  try {
    const stats = await systemLogService.getAuditLogStats();
    res.json(stats);
  } catch (err) {
    console.error("[System Audit API] Lỗi lấy thống kê nhật ký:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi tải thống kê nhật ký." });
  }
});

// GET /api/system/audit-logs/:id - Lấy chi tiết 1 bản ghi nhật ký
router.get("/audit-logs/:id", async (req, res) => {
  try {
    const log = await systemLogService.getAuditLogById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: "Không tìm thấy bản ghi nhật ký." });
    }
    res.json(log);
  } catch (err) {
    console.error("[System Audit API] Lỗi lấy chi tiết nhật ký:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi tải chi tiết nhật ký." });
  }
});

// ==========================================
// EXTERNAL APIS & OTP SERVICES
// ==========================================

// GET /api/system/external-apis - Liệt kê tất cả cấu hình API
router.get("/external-apis", async (req, res) => {
  try {
    const configs = await externalApiConfigService.getAllConfigs();
    res.json({ success: true, configs });
  } catch (err) {
    console.error("[System API] Lỗi lấy danh sách external APIs:", err);
    res.status(500).json({ success: false, error: "Lỗi hệ thống khi tải cấu hình API." });
  }
});

// GET /api/system/external-apis/:id - Chi tiết 1 cấu hình
router.get("/external-apis/:id", async (req, res) => {
  try {
    const config = await externalApiConfigService.getConfigById(Number(req.params.id));
    if (!config) return res.status(404).json({ success: false, error: "Không tìm thấy cấu hình." });
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/system/external-apis - Tạo mới cấu hình
router.post("/external-apis", async (req, res) => {
  try {
    const config = await externalApiConfigService.createConfig(req.body);
    res.status(201).json({ success: true, config, message: "Đã tạo cấu hình mới." });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/system/external-apis/:id - Cập nhật cấu hình
router.put("/external-apis/:id", async (req, res) => {
  try {
    const config = await externalApiConfigService.updateConfig(Number(req.params.id), req.body);
    res.json({ success: true, config, message: "Đã cập nhật cấu hình." });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/system/external-apis/:id - Xóa cấu hình
router.delete("/external-apis/:id", async (req, res) => {
  try {
    const result = await externalApiConfigService.deleteConfig(Number(req.params.id));
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/system/external-apis/:id/test - Ping kiểm tra kết nối
router.post("/external-apis/:id/test", sensitiveOperationRateLimiter, async (req, res) => {
  try {
    const result = await externalApiConfigService.testApiConnection(Number(req.params.id));
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/system/external-apis/analyze-endpoint - Gửi thử request & phân tích cây JSON
router.post("/external-apis/analyze-endpoint", sensitiveOperationRateLimiter, async (req, res) => {
  try {
    const result = await externalApiConfigService.analyzeEndpoint({
      configId: Number(req.body?.config_id),
      method: req.body?.method,
      body: req.body?.body,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/system/external-apis/test-otp - Live Probe kiểm tra lấy mã OTP từ email
router.post("/external-apis/test-otp", sensitiveOperationRateLimiter, async (req, res) => {
  try {
    const { email, service_key } = req.body || {};
    const result = await otpProviderService.probeOtpForEmail({ email, serviceKey: service_key });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
