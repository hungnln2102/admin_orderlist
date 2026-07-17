const logger = require("@/utils/logger");
const { TIMEOUTS, ADMIN_CONSOLE_API_BASE } = require("@/services/renew-adobe/adobe-renew-v2/shared/constants");
const {
  normalizeBatchResult,
  extractUserIdFromAbpCreateBody,
  normalizeAbpReason,
  safeBodyPreview,
  extractApiErrorCode,
  isTrialAlreadyConsumedFromPatch,
} = require("@/services/renew-adobe/adobe-renew-v2/flows/users/addUsersFlow/responseHelpers");

async function captureAdobeApiHeaders(page, orgId) {
  const orgToken = `${orgId}@AdobeOrg`;
  const reqPromise = page.waitForRequest(
    (req) => {
      const url = req.url();
      if (!url.includes("bps-il.adobe.io/jil-api/v2/organizations/")) return false;
      if (!url.includes(orgToken)) return false;
      const method = req.method();
      return method === "GET" || method === "HEAD";
    },
    { timeout: TIMEOUTS.NAVIGATE || 20000 }
  );

  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  const req = await reqPromise;
  return req.headers();
}

async function resolveAssignableProductId(page, orgToken, headers, options = {}) {
  if (options.productId) return String(options.productId).trim();

  const url =
    `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgToken}/products/` +
    "?include_created_date=true&include_expired=true&include_groups_quantity=true" +
    "&include_inactive=false&include_license_activations=true&include_license_allocation_info=false" +
    "&includeAcquiredOfferIds=false&includeConfiguredProductArrangementId=false" +
    "&includeLegacyLSFields=false&license_group_limit=100&processing_instruction_codes=administration,license_data";

  const resp = await page.context().request.get(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      authorization: headers.authorization || headers.Authorization || "",
      "x-api-key": headers["x-api-key"] || headers["X-Api-Key"] || "",
      "x-requested-with": headers["x-requested-with"] || "XMLHttpRequest",
      "x-jil-feature": headers["x-jil-feature"] || "",
      origin: "https://adminconsole.adobe.com",
      referer: `https://adminconsole.adobe.com/${orgToken}/products`,
    },
    timeout: 30000,
  });
  const text = await resp.text().catch(() => "");
  if (!resp.ok()) {
    throw new Error(`products_api_fail_${resp.status()}: ${text.slice(0, 200)}`);
  }

  let list = [];
  try {
    const parsed = JSON.parse(text || "[]");
    list = Array.isArray(parsed) ? parsed : parsed?.items || parsed?.data || [];
  } catch (e) {
    throw new Error(`products_api_parse_fail: ${e.message}`);
  }

  const product =
    list.find((p) => String(p?.status || "").toLowerCase() !== "expired") ||
    list[0];
  const productId = String(product?.id || product?.productId || "").trim();
  if (!productId) throw new Error("product_id_missing");
  return productId;
}

async function createUserViaAbpApi(page, orgToken, email, headers) {
  const apiResponse = await page.context().request.post(
    `https://abpapi.adobe.io/abpapi/organizations/${orgToken}/users`,
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        origin: "https://www.adobe.com",
        referer: "https://www.adobe.com/",
        authorization: headers.authorization || headers.Authorization || "",
        "x-requested-with": headers["x-requested-with"] || "XMLHttpRequest",
        "x-api-key": headers["x-api-key"] || headers["X-Api-Key"] || "",
      },
      data: { email: { primary: email } },
      timeout: 30000,
    }
  );
  const status = apiResponse.status();
  const rawBody = await apiResponse.text().catch(() => "");
  if (!(status >= 200 && status < 300)) {
    logger.warn("[adobe-v2] createUserViaAbpApi failed", {
      email,
      orgToken,
      status,
      body: safeBodyPreview(rawBody),
    });
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    rawBody,
    userId: extractUserIdFromAbpCreateBody(rawBody),
    reason: normalizeAbpReason(status, rawBody),
  };
}

async function assignProductViaPatch(page, orgToken, userId, productId, headers) {
  const apiResponse = await page.context().request.fetch(
    `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgToken}/users`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        origin: "https://adminconsole.adobe.com",
        referer: `https://adminconsole.adobe.com/${orgToken}/users`,
        authorization: headers.authorization || headers.Authorization || "",
        "x-requested-with": headers["x-requested-with"] || "XMLHttpRequest",
        "x-api-key": headers["x-api-key"] || headers["X-Api-Key"] || "",
        "x-jil-feature": headers["x-jil-feature"] || "",
        "x-current-page": "1",
        "x-page-size": "10",
        "x-next-page": "",
        "x-request-id":
          headers["x-request-id"] || `renew-adobe-assign-${Date.now()}`,
      },
      data: [{ op: "add", path: `/${userId}/products/${productId}` }],
      timeout: 30000,
    }
  );
  const status = apiResponse.status();
  const rawBody = await apiResponse.text().catch(() => "");
  const patchParsed = normalizeBatchResult(["_one_"], status, rawBody);
  const apiErrorCode = extractApiErrorCode(rawBody);
  const patchedFailedReason = patchParsed.failed[0]?.reason || "";
  const oneFailedReason =
    apiErrorCode && (!patchedFailedReason || /^http_\d+$/i.test(patchedFailedReason))
      ? apiErrorCode.toLowerCase()
      : patchedFailedReason || `http_${status}`;
  if (!(patchParsed.failed.length === 0 && patchParsed.done.length > 0)) {
    if (isTrialAlreadyConsumedFromPatch(oneFailedReason, rawBody)) {
      logger.info("[adobe-v2] assignProductViaPatch: trial already consumed (bỏ qua Telegram / không cảnh báo): %s", userId);
    } else {
      logger.warn("[adobe-v2] assignProductViaPatch failed", {
        orgToken,
        userId,
        productId,
        status,
        reason: oneFailedReason,
        body: safeBodyPreview(rawBody),
      });
    }
  }
  return {
    ok: patchParsed.failed.length === 0 && patchParsed.done.length > 0,
    status,
    rawBody,
    reason: oneFailedReason,
  };
}

async function assignProductBatchViaPatch(page, orgToken, items, productId, headers) {
  if (!items || items.length === 0) {
    return { status: 200, rawBody: "[]" };
  }
  const payload = items.map((item) => ({
    op: "add",
    path: `/${item.userId}/products/${productId}`,
  }));
  const apiResponse = await page.context().request.fetch(
    `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${orgToken}/users`,
    {
      method: "PATCH",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        origin: "https://adminconsole.adobe.com",
        referer: `https://adminconsole.adobe.com/${orgToken}/users`,
        authorization: headers.authorization || headers.Authorization || "",
        "x-requested-with": headers["x-requested-with"] || "XMLHttpRequest",
        "x-api-key": headers["x-api-key"] || headers["X-Api-Key"] || "",
        "x-jil-feature": headers["x-jil-feature"] || "",
        "x-current-page": "1",
        "x-page-size": String(Math.max(items.length, 10)),
        "x-next-page": "",
        "x-request-id": headers["x-request-id"] || `renew-adobe-assign-batch-${Date.now()}`,
      },
      data: payload,
      timeout: 60000,
    }
  );
  const status = apiResponse.status();
  const rawBody = await apiResponse.text().catch(() => "");
  return { status, rawBody };
}

module.exports = {
  captureAdobeApiHeaders,
  resolveAssignableProductId,
  createUserViaAbpApi,
  assignProductViaPatch,
  assignProductBatchViaPatch,
};
