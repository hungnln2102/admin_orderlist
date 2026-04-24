const logger = require("../../../utils/logger");
const { ADMIN_CONSOLE_API_BASE } = require("./constants");
const { normalizeOrgToken } = require("./usersListApi");
const { extractCcpSeatProductIdsFromOrgProductsList } = require("./accessChecks");

/** Query đúng Admin Console (JIL products) — tách CCP vs gói member theo longName. */
const PRODUCTS_LIST_QUERY =
  "?include_created_date=true&include_expired=true&include_groups_quantity=false" +
  "&include_inactive=false&include_legacy_ls_fields=true&include_license_activations=true" +
  "&include_license_allocation_info=false&include_pricing_data=false&includeFulfillableItemCodesOnly=true" +
  "&processing_instruction_codes=administration";

async function captureProductsApiHeaders(page, orgToken) {
  const token = normalizeOrgToken(orgToken);
  const reqPromise = page.waitForRequest(
    (req) =>
      req.method() === "GET" &&
      req.url().includes(`/jil-api/v2/organizations/${token}/products`) &&
      !req.url().includes("/users"),
    { timeout: 30000 }
  );

  const cur = String(page.url() || "");
  const productsHref = `https://adminconsole.adobe.com/${token}/products`;
  const orgHex = token.split("@")[0] || "";
  const alreadyOnProducts =
    /adminconsole\.adobe\.com\/[^/]+@AdobeOrg\/products/i.test(cur) &&
    (orgHex ? cur.includes(orgHex) : false);

  if (alreadyOnProducts) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  } else {
    await page.goto(productsHref, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }

  const req = await reqPromise;
  const headers = req.headers();
  const authorization = headers.authorization || headers.Authorization || "";
  const xApiKey = headers["x-api-key"] || headers["X-Api-Key"] || "";

  if (!authorization || !xApiKey) {
    throw new Error("Thiếu authorization/x-api-key từ request products.");
  }

  return {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    authorization,
    "x-api-key": xApiKey,
    "x-requested-with": headers["x-requested-with"] || "XMLHttpRequest",
    "x-jil-feature": headers["x-jil-feature"] || "",
    origin: "https://adminconsole.adobe.com",
    referer: productsHref,
  };
}

async function fetchOrganizationProductsJson(page, orgToken, headers) {
  const token = normalizeOrgToken(orgToken);
  const url = `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${token}/products${PRODUCTS_LIST_QUERY}`;
  const resp = await page.context().request.get(url, { headers, timeout: 30000 });
  const text = await resp.text().catch(() => "");
  if (!resp.ok()) {
    throw new Error(`Products API fail ${resp.status()}: ${text.slice(0, 220)}`);
  }
  let list = [];
  try {
    const parsed = JSON.parse(text || "[]");
    list = Array.isArray(parsed) ? parsed : parsed?.items || parsed?.data || [];
  } catch (e) {
    throw new Error(`Products API parse fail: ${e.message}`);
  }
  return Array.isArray(list) ? list : [];
}

/**
 * Sau B12 (trang products): gọi JIL products API, trích các productId CCP (Creative Cloud Pro).
 * Dùng để đối chiếu tuyệt đối với `products` trên từng user từ users API.
 */
async function fetchVerifiedCcpSeatProductIdsFromOrgProductsApi(page, orgId) {
  const orgNorm = String(orgId || "").trim();
  if (!orgNorm) return [];
  const token = normalizeOrgToken(orgNorm);
  try {
    const headers = await captureProductsApiHeaders(page, token);
    const list = await fetchOrganizationProductsJson(page, token, headers);
    const ids = extractCcpSeatProductIdsFromOrgProductsList(list);
    logger.info(
      "[adobe-v2] products-api: org products=%d, ccp_seat_product_ids=%d",
      list.length,
      ids.length
    );
    return ids;
  } catch (e) {
    logger.warn("[adobe-v2] products-api: không lấy được id CCP seat: %s", e.message);
    return [];
  }
}

module.exports = {
  fetchVerifiedCcpSeatProductIdsFromOrgProductsApi,
  captureProductsApiHeaders,
  fetchOrganizationProductsJson,
};
