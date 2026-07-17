const { isConfigured } = require("@/domains/ninerouter/config");
const { proxyToNinerouter } = require("@/domains/ninerouter/gateway");

/**
 * Proxy mọi request dưới mount `/ninerouter` sang `${NINEROUTER_URL}${req.url}`.
 * `req.url` giữ nguyên path + query (ví dụ `/v1/models`, `/api/health`).
 */
async function forward(req, res, next) {
  if (!isConfigured()) {
    return res.status(503).json({
      error: "9Router chưa cấu hình",
      hint: "Đặt biến môi trường NINEROUTER_URL (ví dụ http://localhost:20128).",
    });
  }
  try {
    await proxyToNinerouter(req, res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  forward,
};
