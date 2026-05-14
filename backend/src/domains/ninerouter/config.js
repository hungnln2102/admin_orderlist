/**
 * Cấu hình proxy tới 9Router (OpenAI-compatible gateway).
 * @see https://github.com/decolua/9router
 */

function getBaseUrl() {
  const raw = process.env.NINEROUTER_URL;
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().replace(/\/+$/, "");
}

/** Khóa API phía 9Router (bỏ trống nếu gateway tắt requireApiKey). */
function getApiKey() {
  const raw = process.env.NINEROUTER_KEY;
  if (!raw || typeof raw !== "string") return "";
  return raw.trim();
}

function getTimeoutMs() {
  const n = Number(process.env.NINEROUTER_TIMEOUT_MS);
  if (Number.isFinite(n) && n > 0) return Math.min(n, 1_800_000);
  return 600_000;
}

function isConfigured() {
  return Boolean(getBaseUrl());
}

module.exports = {
  getBaseUrl,
  getApiKey,
  getTimeoutMs,
  isConfigured,
};
