const {
  checkUserAssignedProduct,
  inferAdobeProProductIdSet,
  hasAdobeProAccessFromProducts,
  resolveAuthoritativeCcpProductIdSet,
} = require("@/services/renew-adobe/adobe-renew-v2/shared/accessChecks");

const ABP_API_ORIGIN = "https://abpapi.adobe.io";
const ABP_USERS_ATTRS_QUERY =
  "attributes=account%2CproductAssignments%2Croles%2Cname%2Cemail%2Caccount.type";

/** Header không forward khi replay (tránh lệch / hop-by-hop). */
const SKIP_HEADER_NAMES = new Set([
  "content-length",
  "host",
  "connection",
  "accept-encoding",
  "transfer-encoding",
  "upgrade",
]);

function extractOrgTokenFromUrl(url) {
  const m = String(url || "").match(/\/([A-Fa-f0-9]{20,}@AdobeOrg)/);
  return m ? m[1] : null;
}

function normalizeOrgToken(orgIdOrToken) {
  const raw = String(orgIdOrToken || "").trim();
  if (!raw) return "";
  return raw.includes("@AdobeOrg") ? raw : `${raw}@AdobeOrg`;
}

function extractAbpUserProductRefs(item) {
  if (!item || typeof item !== "object") return [];
  const seen = new Set();
  const out = [];
  const push = (pid) => {
    const id = String(pid || "").trim();
    if (!id) return;
    const key = id.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ id, productId: id });
  };
  const tryAssignments = (node) => {
    if (!node || typeof node !== "object") return;
    const assignments = node.productAssignments || node.product_assignments;
    if (Array.isArray(assignments)) {
      for (const a of assignments) {
        push(a?.productId ?? a?.product_id ?? a?.id);
      }
    }
    const resources = node.resources;
    if (Array.isArray(resources)) {
      for (const r of resources) {
        push(r?.productId ?? r?.product_id);
      }
    }
  };
  tryAssignments(item);
  tryAssignments(item.account);
  return out;
}

function flattenAbpUsersPayload(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return [];
  const nested =
    parsed.users ||
    parsed.items ||
    parsed.data ||
    parsed._embedded?.users ||
    parsed._embedded?.elements;
  if (Array.isArray(nested)) return nested;
  return [];
}

/**
 * Clone gần như toàn bộ header từ request mà SPA đã gửi.
 */
function buildForwardHeadersFromCapturedRequest(req) {
  const raw = req.headers();
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null || value === "") continue;
    if (SKIP_HEADER_NAMES.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  const auth = out.authorization || out.Authorization;
  const xk = out["x-api-key"] || out["X-Api-Key"];
  if (!auth || !xk) {
    throw new Error("Thiếu authorization hoặc x-api-key trên request ABP đã bắt.");
  }
  return out;
}

function mapAbpUserToSnapshotUser(item) {
  const emailRaw =
    item?.username ||
    item?.email ||
    item?.userName ||
    item?.primaryEmail ||
    "";
  const email = String(emailRaw || "").trim();
  let name = "";
  if (item?.name && typeof item.name === "object") {
    const gn = String(item.name.givenName || item.name.firstName || "").trim();
    const fn = String(item.name.familyName || item.name.lastName || "").trim();
    name = `${gn} ${fn}`.trim();
  } else {
    name = String(item?.name || "").trim();
  }
  const products = extractAbpUserProductRefs(item);
  return {
    id: String(item?.id || item?.accountId || item?.userId || "").trim() || null,
    authenticatingAccountId:
      String(item?.authenticatingAccount?.id || "").trim() || null,
    name,
    email,
    products,
    accountStatus: item?.accountStatus || item?.status || null,
    product: false,
    hasProduct: false,
  };
}

function isAdobeEmbedHostPageUrl(url) {
  const u = String(url || "");
  return (
    /:\/\/(www\.)?adobe\.com\//i.test(u) ||
    /:\/\/account\.adobe\.com\//i.test(u) ||
    /:\/\/experience\.adobe\.com\//i.test(u)
  );
}

function applyAdobeProFlags(users, adminEmail = "", pinnedProductIds, extra = {}) {
  const list = Array.isArray(users) ? users : [];
  const { idSet, authoritativeOnly } = resolveAuthoritativeCcpProductIdSet({
    verifiedFromProductsApi: extra.verifiedCcpSeatProductIds,
    pinnedProductIds,
    users: list,
    adminEmail,
  });
  return list.map((u) => ({
    ...u,
    hasProduct: hasAdobeProAccessFromProducts(u?.products, idSet, {
      strictIdOnly: authoritativeOnly,
      authoritativeIdsOnly: authoritativeOnly,
    }),
    product: hasAdobeProAccessFromProducts(u?.products, idSet, {
      strictIdOnly: authoritativeOnly,
      authoritativeIdsOnly: authoritativeOnly,
    }),
  }));
}

function mapApiUserToSnapshotUser(item) {
  const firstName = String(item?.firstName || "").trim();
  const lastName = String(item?.lastName || "").trim();
  const name = `${firstName} ${lastName}`.trim();
  const email = String(item?.email || item?.userName || "").trim();
  const products = Array.isArray(item?.products) ? item.products : [];
  return {
    id: String(item?.id || "").trim() || null,
    authenticatingAccountId:
      String(item?.authenticatingAccount?.id || "").trim() || null,
    name,
    email,
    products,
    accountStatus: item?.accountStatus || null,
    product: false,
    hasProduct: false,
  };
}

module.exports = {
  ABP_API_ORIGIN,
  ABP_USERS_ATTRS_QUERY,
  SKIP_HEADER_NAMES,
  extractOrgTokenFromUrl,
  normalizeOrgToken,
  extractAbpUserProductRefs,
  flattenAbpUsersPayload,
  buildForwardHeadersFromCapturedRequest,
  mapAbpUserToSnapshotUser,
  isAdobeEmbedHostPageUrl,
  applyAdobeProFlags,
  mapApiUserToSnapshotUser,
  checkUserAssignedProduct,
  inferAdobeProProductIdSet,
  hasAdobeProAccessFromProducts,
};
