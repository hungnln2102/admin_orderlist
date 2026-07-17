const logger = require("@/utils/logger");
const { normalizeBaseUrl } = require("@/domains/product-descriptions/controller/shared/urlHelpers");

const WEBSITE_CACHE_INVALIDATE_URL =
  process.env.WEBSITE_CACHE_INVALIDATE_URL ||
  process.env.WEBSITE_API_BASE_URL ||
  "";

const buildWebsiteInvalidateUrl = () => {
  const trimmed = normalizeBaseUrl(WEBSITE_CACHE_INVALIDATE_URL);
  if (!trimmed) return "";
  if (/\/cache\/invalidate(?:\?|$)/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/cache/invalidate`;
};

const invalidateWebsiteSeoCache = async () => {
  const url = buildWebsiteInvalidateUrl();
  if (!url || typeof fetch !== "function") return;

  try {
    const response = await fetch(url, { method: "POST" });
    if (!response.ok) {
      logger.warn("Website cache invalidate responded non-OK", {
        url,
        status: response.status,
      });
    }
  } catch (error) {
    logger.warn("Website cache invalidate failed", {
      url,
      error: error?.message || String(error || ""),
    });
  }
};

module.exports = { invalidateWebsiteSeoCache };
