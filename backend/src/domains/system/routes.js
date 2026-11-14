const express = require("express");
const router = express.Router();
const systemConfigService = require("./services/systemConfigService");
const cronJobService = require("./services/cronJobService");
const systemLogService = require("./services/systemLogService");
const { listProviderCatalog } = require("./providers/registry");
const otpProviderService = require("./services/otpProviderService");
const totpController = require("./controllers/totpController");
const productApiController = require("./controllers/productApiController");
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

// GET /api/system/providers - Danh mục provider hard-code
router.get("/providers", (_req, res) => {
  res.json({ success: true, providers: listProviderCatalog() });
});

// POST /api/system/providers/:key/test - Kiểm tra provider bằng input do người dùng nhập
router.post("/providers/:key/test", sensitiveOperationRateLimiter, async (req, res) => {
  try {
    const { email, input } = req.body || {};
    const result = await otpProviderService.probeOtpForEmail({ email: email || input, serviceKey: req.params.key });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/system/totp/generate - Generate Google Authenticator code from request-only Base32 secret.
router.post("/totp/generate", sensitiveOperationRateLimiter, totpController.generate);

// ==========================================
// PRODUCT API CONFIGS MAPPING
// ==========================================
// GET /api/system/product-apis - Liệt kê tất cả sản phẩm và cấu hình API tương ứng
router.get("/product-apis", productApiController.list);

// GET /api/system/product-apis/rules - Danh sách quy tắc định tuyến ô input & NCC (Phương Án A)
router.get("/product-apis/rules", productApiController.listRules);

// POST /api/system/product-apis/rules - Tạo mới quy tắc định tuyến
router.post("/product-apis/rules", productApiController.createRule);

// PUT /api/system/product-apis/rules/:id - Cập nhật quy tắc định tuyến
router.put("/product-apis/rules/:id", productApiController.updateRule);

// DELETE /api/system/product-apis/rules/:id - Xóa quy tắc định tuyến
router.delete("/product-apis/rules/:id", productApiController.deleteRule);

// GET /api/system/product-apis/mapping - Lấy dictionary map theo product_id/variant_id/display_name
router.get("/product-apis/mapping", productApiController.getMapping);

// POST /api/system/product-apis - Gán API vào sản phẩm
router.post("/product-apis", productApiController.assign);

// PUT /api/system/product-apis/:id - Cập nhật cấu hình mapping
router.put("/product-apis/:id", productApiController.update);

// PUT /api/system/product-apis/:id/default - Đặt API làm mặc định cho sản phẩm
router.put("/product-apis/:id/default", productApiController.setDefault);

// DELETE /api/system/product-apis/:id - Gỡ bỏ API khỏi sản phẩm
router.delete("/product-apis/:id", productApiController.remove);

module.exports = router;
