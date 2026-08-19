const logger = require("@/utils/logger");
const extConfigService = require("@/services/externalApiConfigService");

const listExternalApis = async (_req, res) => {
  try {
    const configs = await extConfigService.getAllConfigs();
    return res.json({ success: true, configs });
  } catch (err) {
    logger.error("[system-config] Lỗi khi liệt kê configs: %s", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getExternalApi = async (req, res) => {
  try {
    const config = await extConfigService.getConfigById(Number(req.params.id));
    if (!config) {
      return res.status(404).json({ success: false, error: "Không tìm thấy cấu hình." });
    }
    return res.json({ success: true, config });
  } catch (err) {
    logger.error("[system-config] Lỗi khi lấy config: %s", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const createExternalApi = async (req, res) => {
  try {
    const config = await extConfigService.createConfig(req.body);
    return res.status(201).json({ success: true, config, message: "Đã tạo cấu hình mới." });
  } catch (err) {
    logger.error("[system-config] Lỗi khi tạo config: %s", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
};

const updateExternalApi = async (req, res) => {
  try {
    const config = await extConfigService.updateConfig(Number(req.params.id), req.body);
    return res.json({ success: true, config, message: "Đã cập nhật cấu hình." });
  } catch (err) {
    logger.error("[system-config] Lỗi khi cập nhật config: %s", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
};

const deleteExternalApi = async (req, res) => {
  try {
    await extConfigService.deleteConfig(Number(req.params.id));
    return res.json({ success: true, message: "Đã xóa cấu hình." });
  } catch (err) {
    logger.error("[system-config] Lỗi khi xóa config: %s", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
};

const testExternalApi = async (req, res) => {
  try {
    const config = await extConfigService.getConfigById(Number(req.params.id));
    if (!config) {
      return res.status(404).json({ success: false, error: "Không tìm thấy cấu hình." });
    }

    const axios = require("axios");
    const startTime = Date.now();
    const response = await axios.get(config.base_url, {
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const elapsed = Date.now() - startTime;

    return res.json({
      success: true,
      test: {
        status: response.status,
        statusText: response.statusText,
        responseTimeMs: elapsed,
        contentType: response.headers["content-type"] || "unknown",
        reachable: response.status < 500,
      },
    });
  } catch (err) {
    return res.json({
      success: true,
      test: {
        status: 0,
        statusText: err.message,
        responseTimeMs: null,
        contentType: null,
        reachable: false,
      },
    });
  }
};

module.exports = {
  listExternalApis,
  getExternalApi,
  createExternalApi,
  updateExternalApi,
  deleteExternalApi,
  testExternalApi,
};
