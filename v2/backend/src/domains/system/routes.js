const express = require("express");
const router = express.Router();
const systemConfigService = require("./services/systemConfigService");

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
    
    // Giả sử có req.user.username sau khi qua middleware Auth
    const updatedBy = req.user?.username || "ADMIN"; 

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "Thiếu giá trị 'value' cần cập nhật." });
    }

    const updated = await systemConfigService.set(key, value, updatedBy);
    res.json(updated);
  } catch (err) {
    console.error(`[System API] Lỗi cập nhật cấu hình ${req.params.key}:`, err);
    res.status(400).json({ error: err.message || "Không thể cập nhật cấu hình." });
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

module.exports = router;
