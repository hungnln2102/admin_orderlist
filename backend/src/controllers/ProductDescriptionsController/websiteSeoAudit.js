require("dotenv").config();
const logger = require("../../utils/logger");

const WEBSITE_SEO_AUDIT_URL =
  process.env.WEBSITE_SEO_AUDIT_URL || process.env.WEBSITE_API_BASE_URL || "";

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const buildWebsiteSeoAuditUrl = () => {
  const trimmed = normalizeBaseUrl(WEBSITE_SEO_AUDIT_URL);
  if (!trimmed) return "";
  if (/\/api\/seo\/product-audit(?:\?|$)/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/api/seo/product-audit`;
};

const auditProductSeoProxy = async (req, res) => {
  const url = buildWebsiteSeoAuditUrl();
  if (!url || typeof fetch !== "function") {
    return res.status(503).json({
      error:
        "Website SEO audit chưa được cấu hình. Cần WEBSITE_SEO_AUDIT_URL hoặc WEBSITE_API_BASE_URL.",
    });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shortDesc: typeof req.body?.shortDesc === "string" ? req.body.shortDesc : "",
        descriptionHtml:
          typeof req.body?.descriptionHtml === "string"
            ? req.body.descriptionHtml
            : "",
        rulesHtml: typeof req.body?.rulesHtml === "string" ? req.body.rulesHtml : "",
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      logger.warn("Website SEO audit returned non-OK", {
        url,
        status: response.status,
        payload,
      });
      return res.status(response.status).json(
        payload || { error: "Website SEO audit failed." }
      );
    }

    return res.json(payload || { data: null });
  } catch (error) {
    logger.warn("Website SEO audit proxy failed", {
      url,
      error: error?.message || String(error || ""),
    });
    return res.status(502).json({
      error: "Không thể kết nối tới Website SEO audit.",
    });
  }
};

module.exports = {
  auditProductSeoProxy,
};
