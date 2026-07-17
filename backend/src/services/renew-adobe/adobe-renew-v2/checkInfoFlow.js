/**
 * Adobe Renew V2 — Luồng lấy thông tin B10→B13.
 * Admin Console (Profile/Org switcher) → products → users.
 */

const logger = require("@/utils/logger");
const { runCheckOrgNameFlow, runCheckProductFlow, extractOrgIdFromUrl } = require("@/services/renew-adobe/adobe-renew-v2/flows/check");
const { fetchUsersViaApi } = require("@/services/renew-adobe/adobe-renew-v2/shared/usersListApi");
const { fetchVerifiedCcpSeatProductIdsFromOrgProductsApi } = require("@/services/renew-adobe/adobe-renew-v2/shared/orgProductsApi");

const ADMIN_USERS = "https://adminconsole.adobe.com/users";

function toNonNegativeNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function deriveLicenseStatusByContractCount(contractActiveLicenseCount) {
  const n = Number(contractActiveLicenseCount || 0);
  return n > 0 ? "Paid" : "Expired";
}

function extractOrgIdFromToken(orgToken) {
  const token = String(orgToken || "").trim();
  if (!token) return null;
  const m = token.match(/^([A-Fa-f0-9]{20,})@AdobeOrg$/);
  return m ? m[1] : null;
}

const B13_GOTO_MS = (() => {
  const n = Number.parseInt(process.env.ADOBE_V2_B13_GOTO_MS || "", 10);
  return Number.isFinite(n) && n >= 30000 ? n : 60000;
})();

/** Giống add/delete users flow: trang users thật thường là /{orgId}@AdobeOrg/users */
function buildAdminUsersUrl(orgId) {
  const id = orgId && String(orgId).trim();
  if (id) return `https://adminconsole.adobe.com/${id}@AdobeOrg/users`;
  return ADMIN_USERS;
}

function isAdminConsoleUsersPath(url) {
  if (!url || typeof url !== "string") return false;
  if (!/adminconsole\.adobe\.com/i.test(url)) return false;
  return (
    url.includes("@AdobeOrg/users") ||
    /\/users(?:\/|$|\?|#)/i.test(url)
  );
}

/** SPA Adobe đôi khi giữ /products hoặc route khác dù đã goto /users — cần nudge định kỳ. */
function isAdminConsoleOrgScopedNonUsers(url) {
  if (!url || typeof url !== "string") return false;
  if (!/adminconsole\.adobe\.com/i.test(url)) return false;
  if (!/@AdobeOrg\//i.test(url)) return false;
  return !isAdminConsoleUsersPath(url);
}

/**
 * Cần goto lại URL users đã biết (recovery) khi đang kẹt trên Admin Console nhưng không phải trang users.
 * Bao gồm cả /{org}@AdobeOrg/products và redirect global tới /products (không có @AdobeOrg trong path).
 */
function needsUsersPageRecovery(url) {
  if (!url || typeof url !== "string") return false;
  if (!/adminconsole\.adobe\.com/i.test(url)) return false;
  if (isAdminConsoleUsersPath(url)) return false;
  if (isAdminConsoleOrgScopedNonUsers(url)) return true;
  if (/\/products(?:\/|$|\?|#)/i.test(url)) return true;
  return false;
}

/**
 * B10–B13: Profile name (account.adobe.com) → products → users (adminconsole).
 * Nếu options.existingOrgName có sẵn thì bỏ qua B10–B11 (không vào account.adobe.com lấy profile).
 * @param {import('playwright').Page} page
 * @param {{ existingOrgName?: string|null, cachedContractActiveLicenseCount?: number|null, forceProductCheck?: boolean, adminLoginEmail?: string|null, pinnedCcpProductIds?: string[] }} options
 * @returns {Promise<{ org_name: string|null, orgId: string|null, license_status: string, products: any[], users: any[], contractActiveLicenseCount: number, ccpSeatProductIds: string[], jil_users_raw_pages?: unknown[] }>}
 */
async function runB10ToB13(page, options = {}) {
  const existingOrgName = options.existingOrgName && String(options.existingOrgName).trim() ? String(options.existingOrgName).trim() : null;
  const cachedContractActiveLicenseCount = toNonNegativeNumber(
    options.cachedContractActiveLicenseCount
  );
  const forceProductCheck = options.forceProductCheck === true;
  const adminLoginEmail =
    options.adminLoginEmail && String(options.adminLoginEmail).trim()
      ? String(options.adminLoginEmail).trim()
      : "";
  const pinnedCcpProductIds = Array.isArray(options.pinnedCcpProductIds)
    ? options.pinnedCcpProductIds
    : [];
  let org_name = null;
  let orgId = null;
  let products = [];
  let users = [];
  let license_status = "unknown";
  let contractActiveLicenseCount = 0;
  /** @type {string[]} */
  let ccpSeatProductIds = [];
  let ranProductPageCheck = false;
  /** @type {unknown[]|null} */
  let jilUsersRawPages = null;
  const mergeJilRaw = (apiUsersResult) => {
    if (!apiUsersResult?.jilRawPages || !Array.isArray(apiUsersResult.jilRawPages)) return;
    if (!jilUsersRawPages) jilUsersRawPages = [];
    jilUsersRawPages.push(...apiUsersResult.jilRawPages);
  };

  const orgResult = await runCheckOrgNameFlow(page, { existingOrgName });
  org_name = orgResult.org_name;

  if (!forceProductCheck && cachedContractActiveLicenseCount != null) {
    contractActiveLicenseCount = cachedContractActiveLicenseCount;
    license_status = deriveLicenseStatusByContractCount(contractActiveLicenseCount);
    logger.info(
      "[adobe-v2] B12: skip products check, dùng lisencecount cache=%s",
      contractActiveLicenseCount
    );
  } else {
    const productResult = await runCheckProductFlow(page);
    orgId = productResult.orgId || orgId;
    products = productResult.products || [];
    license_status = productResult.license_status || "unknown";
    contractActiveLicenseCount = Number(productResult.contractActiveLicenseCount || 0);
    ranProductPageCheck = true;
  }

  /** Khi skip B12, orgId chưa có — lấy từ URL hiện tại (overview …@AdobeOrg/…) tránh goto /users không org. */
  if (!orgId) {
    const fromPage = extractOrgIdFromUrl(page.url());
    if (fromPage) {
      orgId = fromPage;
      logger.info("[adobe-v2] B13: orgId từ URL hiện tại=%s", orgId);
    }
  }

  /** JIL products API (sau B12): lấy đúng productId CCP seat trước khi đọc users — đối chiếu id tuyệt đối. */
  if (ranProductPageCheck && orgId) {
    ccpSeatProductIds = await fetchVerifiedCcpSeatProductIdsFromOrgProductsApi(page, orgId);
  }

  const usersUrlPrimary = buildAdminUsersUrl(orgId);
  logger.info("[adobe-v2] B13: adminconsole/users (url=%s)", usersUrlPrimary.slice(0, 96));

  await page.goto(usersUrlPrimary, {
    waitUntil: "domcontentloaded",
    timeout: B13_GOTO_MS,
  }).catch((navErr) => {
    logger.warn("[adobe-v2] B13: goto users thất bại: %s", navErr.message);
  });
  /** Tránh networkidle — Adobe SPA dễ treo / làm hỏng context trên một số môi trường headless. */
  await page.waitForLoadState("domcontentloaded", { timeout: 28000 }).catch(() => {});
  await page
    .waitForURL((u) => isAdminConsoleUsersPath(String(u)), { timeout: 20000 })
    .catch(() => {});
  if (!orgId) orgId = extractOrgIdFromUrl(page.url());
  let apiUsers;
  try {
    apiUsers = await fetchUsersViaApi(page, {
      orgId,
      adminEmail: adminLoginEmail,
      pinnedCcpProductIds,
      verifiedCcpSeatProductIds: ccpSeatProductIds,
    });
    mergeJilRaw(apiUsers);
  } catch (usersErr) {
    if (cachedContractActiveLicenseCount == null) {
      throw usersErr;
    }
    logger.warn(
      "[adobe-v2] users-api fail khi skip B12, fallback chạy products check: %s",
      usersErr.message
    );
    const productFallback = await runCheckProductFlow(page);
    orgId = productFallback.orgId || orgId;
    products = productFallback.products || products;
    ranProductPageCheck = true;
    if (orgId) {
      ccpSeatProductIds = await fetchVerifiedCcpSeatProductIdsFromOrgProductsApi(page, orgId);
    }
    await page
      .goto(buildAdminUsersUrl(orgId), {
        waitUntil: "domcontentloaded",
        timeout: B13_GOTO_MS,
      })
      .catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 28000 }).catch(() => {});
    apiUsers = await fetchUsersViaApi(page, {
      orgId,
      adminEmail: adminLoginEmail,
      pinnedCcpProductIds,
      verifiedCcpSeatProductIds: ccpSeatProductIds,
    });
    mergeJilRaw(apiUsers);
  }
  orgId = orgId || extractOrgIdFromToken(apiUsers?.orgToken);
  users = apiUsers.users.map((u) => ({
    id: u.id || null,
    authenticatingAccountId: u.authenticatingAccountId || null,
    name: u.name || "",
    email: u.email || "",
    products: Array.isArray(u.products) ? u.products : [],
    hasProduct: u.hasProduct === true,
  }));
  logger.info("[adobe-v2] users-api: %d", users.length);

  return {
    org_name,
    orgId,
    license_status,
    products,
    users,
    contractActiveLicenseCount,
    ccpSeatProductIds,
    ...(jilUsersRawPages && jilUsersRawPages.length
      ? { jil_users_raw_pages: jilUsersRawPages }
      : {}),
  };
}

module.exports = {
  runB10ToB13,
  needsUsersPageRecovery,
};
