const logger = require("../../../utils/logger");
const { ADMIN_CONSOLE_API_BASE, resolveAdobeEmbedPageUrl } = require("./constants");
const {
  normalizeOrgToken,
  buildForwardHeadersFromCapturedRequest,
} = require("./usersListApi");
const { extractCcpSeatProductIdsFromOrgProductsList } = require("./accessChecks");

/** Query đúng Admin Console (JIL products) — tách CCP vs gói member theo longName. */
const PRODUCTS_LIST_QUERY =
  "?include_created_date=true&include_expired=true&include_groups_quantity=false" +
  "&include_inactive=false&include_legacy_ls_fields=true&include_license_activations=true" +
  "&include_license_allocation_info=false&include_pricing_data=false&includeFulfillableItemCodesOnly=true" +
  "&processing_instruction_codes=administration";

function isAdobeEmbedHostPageUrl(url) {
  const u = String(url || "");
  return (
    /:\/\/(www\.)?adobe\.com\//i.test(u) ||
    /:\/\/account\.adobe\.com\//i.test(u) ||
    /:\/\/experience\.adobe\.com\//i.test(u)
  );
}

async function captureProductsApiHeaders(page, orgToken) {
  const token = normalizeOrgToken(orgToken);
  const matchProducts = (req) =>
    req.method() === "GET" &&
    req.url().includes(`/jil-api/v2/organizations/${token}/products`) &&
    !req.url().includes("/users");

  const embedUrl = resolveAdobeEmbedPageUrl();
  const orgHex = token.split("@")[0] || "";
  const productsHref = `https://adminconsole.adobe.com/${token}/products`;

  const captureOnce = async (navFn) => {
    const reqPromise = page.waitForRequest(matchProducts, { timeout: 32000 });
    await navFn();
    return reqPromise;
  };

  const cur = String(page.url() || "");
  try {
    const req = await captureOnce(async () => {
      if (isAdobeEmbedHostPageUrl(cur)) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
        return;
      }
      await page.goto(embedUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    });
    return { forwardedHeaders: buildForwardHeadersFromCapturedRequest(req) };
  } catch (e1) {
    logger.warn(
      "[adobe-v2] products-api: không bắt JIL trên Adobe.com (%s), thử adminconsole/products",
      e1.message
    );
    const req = await captureOnce(async () => {
      const u = String(page.url() || "");
      if (
        /adminconsole\.adobe\.com\/[^/]+@AdobeOrg\/products/i.test(u) &&
        (orgHex ? u.includes(orgHex) : true)
      ) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
        return;
      }
      await page.goto(productsHref, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    });
    return { forwardedHeaders: buildForwardHeadersFromCapturedRequest(req) };
  }
}

async function fetchOrganizationProductsJson(page, orgToken, forwardedHeaders) {
  const token = normalizeOrgToken(orgToken);
  const url = `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations/${token}/products${PRODUCTS_LIST_QUERY}`;
  const resp = await page.context().request.get(url, { headers: forwardedHeaders, timeout: 30000 });
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
    const { forwardedHeaders } = await captureProductsApiHeaders(page, token);
    const list = await fetchOrganizationProductsJson(page, token, forwardedHeaders);
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
