const logger = require("../../../utils/logger");
const { normalizeBaseUrl } = require("../../product-descriptions/controller/shared/urlHelpers");

const WEBSITE_API_BASE_URL =
  process.env.WEBSITE_MAINTENANCE_INVALIDATE_URL ||
  process.env.WEBSITE_CACHE_INVALIDATE_URL ||
  process.env.WEBSITE_API_BASE_URL ||
  "";

const buildInvalidateUrl = () => {
  const trimmed = normalizeBaseUrl(WEBSITE_API_BASE_URL);
  if (!trimmed) return "";
  if (/\/maintenance\/cache\/invalidate(?:\?|$)/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/api/maintenance/cache/invalidate`;
};

const invalidateWebsiteMaintenanceCache = async () => {
  const url = buildInvalidateUrl();
  if (!url || typeof fetch !== "function") return;

  try {
    const response = await fetch(url, { method: "POST" });
    if (!response.ok) {
      logger.warn("[site-maintenance] Website maintenance cache invalidate non-OK", {
        url,
        status: response.status,
      });
    }
  } catch (error) {
    logger.warn("[site-maintenance] Website maintenance cache invalidate failed", {
      url,
      error: error?.message || String(error || ""),
    });
  }
};

module.exports = { invalidateWebsiteMaintenanceCache };
