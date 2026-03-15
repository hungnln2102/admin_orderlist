/**
 * Entry point Adobe HTTP service (Renew Adobe).
 *
 * Luồng: loginViaHttp (fast path / refresh / SUSI / Playwright) → getOrgId hoặc orgId từ URL
 * → getProducts + getUsers (hoặc browserData nếu Playwright đã fetch) → checkAccount / addUser / deleteUser.
 *
 * Env: ADOBE_PROXY (proxy đổi IP), ADOBE_TIMEOUT_* (timeout ms), PLAYWRIGHT_HEADLESS.
 * Cookie/token lưu DB (alert_config): { cookies, accessToken, refreshToken?, savedAt }.
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
const { loginViaHttp } = require("./login");
const { loginWithPlaywright } = require("./loginBrowser");
const { getOrgId, getProducts, getProductUserEmails, getUsers, addUsers, removeUser, assignProductToUsers, removeProductFromUser } = require("./adminConsole");
const adobeRenewV2 = require("../adobe-renew-v2");
const { exportCookies, createHttpClient, importCookies } = require("./httpClient");
const { getPlaywrightProxyOptions } = require("./proxyConfig");

/**
 * Check account bằng luồng V2 (B1–B13) + B14 (auto-assign URL) trên cùng 1 browser — không bật/tắt browser hai lần.
 */
async function checkAccountV2(email, password, options = {}) {
  const adobeRenewV2 = require("../adobe-renew-v2");
  const savedCookiesFromDb = normalizeSavedCookiesFromDb(options.savedCookiesFromDb);
  const cookiesToUse = savedCookiesFromDb?.cookies || [];
  const mailBackupId = options.mailBackupId || null;
  const existingOrgName = options.existingOrgName && String(options.existingOrgName).trim() ? String(options.existingOrgName).trim() : null;

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const proxyOptions = getPlaywrightProxyOptions();
  const launchOptions = {
    headless,
    slowMo: headless ? 0 : 80,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  };
  if (proxyOptions) launchOptions.proxy = proxyOptions;

  const browser = await chromium.launch(launchOptions);
  let result;
  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    logger.info("[adobe-http] checkAccount V2 (B1–B13 + B14 cùng browser)...");
    result = await adobeRenewV2.runCheckFlow(email, password, {
      savedCookies: cookiesToUse,
      mailBackupId,
      sharedSession: { context, page },
      existingOrgName,
    });

    if (!result.success) {
      return { success: false, scrapedData: null, savedCookies: null, error: result.error };
    }

    const adminEmail = email.toLowerCase().trim();
    const users = (result.users || []).map((u) => ({
      name: u.name || "",
      email: (u.email || "").trim(),
      product: u.hasProduct === true,
    }));
    const hasProducts = (result.products || []).length > 0;
    if (!hasProducts) {
      logger.info("[adobe-http] B12 không có product → chỉ dùng kết quả tới B13, bỏ qua B14/B15");
    }
    const adminHasProduct = hasProducts && users.some((u) => (u.email || "").toLowerCase() === adminEmail && u.product === true);
    const manageTeamMembers = users.filter((u) => (u.email || "").toLowerCase() !== adminEmail);
    const productInfo = {
      hasPlan: result.license_status === "Paid",
      licenseStatus: result.license_status || "unknown",
      products: (result.products || []).map((p) => ({ id: p.name, name: p.name, licenseQuota: p.total || 0, isFree: false })),
    };

    if (adminHasProduct) {
      try {
        await adobeRenewV2.runB15RemoveProductFromAdmin(page, email, { orgId: result.orgId });
      } catch (e) {
        logger.warn("[adobe-http] B15 remove admin product error: %s", e.message);
      }
    }
    let urlAccess = (options.existingUrlAccess && String(options.existingUrlAccess).trim()) || null;
    if (urlAccess) {
      logger.info("[adobe-http] Đã có url_access trong DB → bỏ qua B14 (không vào mục tạo URL)");
    }
    if (hasProducts && !urlAccess && result.orgId) {
      try {
        const pwResult = await adobeRenewV2.getOrCreateAutoAssignUrlWithPage(page, result.orgId, email, password, { mailBackupId });
        urlAccess = pwResult.url;
        if (pwResult.savedCookies && pwResult.savedCookies.length) result.cookies = pwResult.savedCookies;
      } catch (e) {
        logger.warn("[adobe-http] B14 auto-assign error: %s", e.message);
      }
    }

    const scrapedData = {
      orgName: result.org_name || null,
      userCount: manageTeamMembers.length,
      licenseStatus: result.license_status || "unknown",
      adobe_org_id: result.orgId || null,
      profileName: result.org_name || null,
      manageTeamMembers,
      adminConsoleUsers: users,
      urlAccess,
    };

    const savedCookies = {
      cookies: result.cookies || [],
      savedAt: new Date().toISOString(),
    };

    logger.info("[adobe-http] checkAccount V2 xong: org=%s, users=%s, license=%s, saved session cookies=%d",
      result.org_name, users.length, result.license_status, (result.cookies || []).length);
    return { success: true, scrapedData, savedCookies };
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Login + lấy org ID + org name. Nếu fast path (saved cookies) thất bại → fallback Playwright.
 * @returns {{ client, jar, accessToken, orgId, orgName }}
 */
/**
 * Chuẩn hóa savedCookiesFromDb từ DB: nếu cột là TEXT thì trả về string, cần parse thành object.
 * Coi [] hoặc {} hoặc { cookies: [] } là "không có config còn hiệu lực" → trả về null.
 * @param {object|string|null} raw
 * @returns {{ cookies: Array, accessToken?: string }|null}
 */
function normalizeSavedCookiesFromDb(raw) {
  if (raw == null) return null;
  let obj = raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      obj = parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }
  if (obj == null) return null;
  if (Array.isArray(obj)) return null;
  if (typeof obj !== "object") return null;
  const cookies = obj.cookies;
  if (!Array.isArray(cookies) || cookies.length === 0) return null;
  return obj;
}

async function loginAndGetOrg(email, password, options = {}) {
  const savedCookiesFromDb = normalizeSavedCookiesFromDb(options.savedCookiesFromDb);
  const savedCookies = savedCookiesFromDb?.cookies || options.savedCookies || [];
  const savedAccessToken = savedCookiesFromDb?.accessToken ?? options.savedAccessToken ?? null;
  const savedRefreshToken = savedCookiesFromDb?.refreshToken ?? options.savedRefreshToken ?? null;
  const mailBackupId = options.mailBackupId || null;

  const loginResult = await loginViaHttp(email, password, {
    savedCookies,
    savedAccessToken,
    savedRefreshToken,
    mailBackupId,
  });

  if (!loginResult.success) {
    throw new Error(loginResult.error || "Login thất bại");
  }

  let { client, jar, accessToken, refreshToken = null, usedBrowser, orgId: loginOrgId, browserData = null } = loginResult;

  let orgResult = null;
  // Khi vừa login bằng Playwright, token có thể bị Adobe coi là invalid ngay sau khi đóng browser (401).
  // Ưu tiên dùng orgId lấy từ URL trong browser — tránh gọi getOrgId với token lỗi.
  if (usedBrowser && loginOrgId) {
    logger.info("[adobe-http] Dùng org ID từ Playwright URL (tránh 401 token): %s", loginOrgId);
    // Nếu có browserData, lấy orgName từ đó
    const orgNameFromData = browserData?.orgName || null;
    orgResult = { orgId: loginOrgId, orgName: orgNameFromData };
  }
  if (!orgResult) {
    orgResult = await getOrgId(client, accessToken);
  }
  if (!orgResult && loginOrgId) {
    logger.info("[adobe-http] getOrgId không có kết quả, dùng org ID từ Playwright URL: %s", loginOrgId);
    orgResult = { orgId: loginOrgId, orgName: browserData?.orgName || null };
  }

  // Chỉ retry Playwright nếu chưa dùng browser (fast path thất bại lấy org)
  if (!orgResult && !usedBrowser) {
    logger.info("[adobe-http] Org=null → fast path không lấy được org, chuyển Playwright...");

    const browserResult = await loginWithPlaywright(email, password, { savedCookies, mailBackupId });
    if (!browserResult.success) {
      throw new Error(browserResult.error || "Playwright login thất bại");
    }

    const fresh = createHttpClient();
    client = fresh.client;
    jar = fresh.jar;
    await importCookies(jar, browserResult.cookies);
    accessToken = browserResult.accessToken;
    browserData = browserResult.browserData || null;
    refreshToken = browserResult.refreshToken || null;

    orgResult = await getOrgId(client, accessToken);
    if (!orgResult && browserResult.orgId) {
      logger.info("[adobe-http] Dùng org ID từ Playwright URL: %s", browserResult.orgId);
      orgResult = { orgId: browserResult.orgId, orgName: browserData?.orgName || null };
    }
  }

  if (!orgResult) {
    throw new Error("Không lấy được org ID sau tất cả strategies");
  }

  return { client, jar, accessToken, refreshToken, orgId: orgResult.orgId, orgName: orgResult.orgName, browserData };
}

/**
 * Check tài khoản Adobe: luồng V2 (adobe-renew-v2, B1–B13). V1 đã loại bỏ.
 */
async function checkAccount(email, password, options = {}) {
  logger.info("[adobe-http] checkAccount (V2): %s", email);
  return await checkAccountV2(email, password, options);
}

/**
 * Thêm user vào tài khoản Adobe.
 */
async function addUserToAccount(email, password, userEmails, options = {}) {
  const { client, accessToken, orgId } = await loginAndGetOrg(email, password, options);
  if (!accessToken) throw new Error("Không có access token để gọi API add user");
  return addUsers(client, orgId, accessToken, userEmails);
}

/**
 * Xóa user khỏi tài khoản Adobe.
 */
async function removeUserFromAccount(email, password, userEmail, options = {}) {
  const { client, accessToken, orgId } = await loginAndGetOrg(email, password, options);
  if (!accessToken) throw new Error("Không có access token để gọi API remove user");
  return removeUser(client, orgId, accessToken, userEmail);
}

/**
 * Xóa nhiều user (auto-delete flow). Luồng V2: 1 browser, login (B1–B9) → /users → xóa → snapshot.
 */
async function autoDeleteUsers(email, password, userEmails, options = {}) {
  if (!userEmails || userEmails.length === 0) {
    return { deleted: [], failed: [], snapshot: null };
  }
  const savedCookies = options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  logger.info("[adobe-http] Xóa %d user qua V2 (1 browser: login → xóa → snapshot)...", userEmails.length);
  const v2Result = await adobeRenewV2.deleteUsersV2(email, password, userEmails, {
    savedCookies,
    mailBackupId: options.mailBackupId || null,
  });
  const result = {
    deleted: v2Result.deleted || [],
    failed: v2Result.failed || [],
    snapshot: v2Result.snapshot || null,
  };
  if (v2Result.savedCookies && v2Result.savedCookies.cookies && v2Result.savedCookies.cookies.length) {
    result.savedCookies = v2Result.savedCookies;
  }
  return result;
}

/**
 * Add users + gắn product + trả về snapshot mới.
 * Dùng cho auto-assign flow (không cần caller re-check riêng).
 */
async function addUsersWithProduct(email, password, userEmails, options = {}) {
  const { client, jar, accessToken, orgId } = await loginAndGetOrg(email, password, options);
  if (!accessToken) throw new Error("Không có access token");

  // 1. Get paid products
  const productInfo = await getProducts(client, orgId, accessToken);
  const paidProducts = productInfo.products.filter((p) => !p.isFree && p.id);

  // 2. Add users to org
  const addResult = await addUsers(client, orgId, accessToken, userEmails);

  // 3. Assign product to added users
  let assignResult = null;
  if (paidProducts.length > 0) {
    assignResult = await assignProductToUsers(client, orgId, accessToken, userEmails, paidProducts);
  }

  // 4. Admin KHÔNG ĐƯỢC giữ product → remove nếu có
  const adminEmail = email.toLowerCase().trim();
  if (paidProducts.length > 0) {
    const paidProductIds = paidProducts.map((p) => p.id);
    const checkAdminProduct = await getProductUserEmails(client, orgId, accessToken, paidProductIds);
    if (checkAdminProduct.has(adminEmail)) {
      logger.info("[adobe-http] Admin %s đang giữ product sau add → removing...", adminEmail);
      await removeProductFromUser(client, orgId, accessToken, adminEmail, paidProducts);
    }
  }

  // 5. Re-fetch users → build snapshot mới
  const users = await getUsers(client, orgId, accessToken);
  const paidProductIds = paidProducts.map((p) => p.id);
  const productEmails = await getProductUserEmails(client, orgId, accessToken, paidProductIds);

  const manageTeamMembers = users
    .filter((u) => (u.email || "").toLowerCase().trim() !== adminEmail)
    .map((u) => ({
      name: u.name,
      email: u.email || "",
      product: productEmails.has((u.email || "").toLowerCase().trim()),
    }));

  const savedCookies = exportCookies(jar);
  savedCookies.accessToken = accessToken;

  logger.info("[adobe-http] addUsersWithProduct done: added=%s, assign=%s, snapshot=%s",
    addResult.added?.length ?? 0, assignResult?.success ?? false, manageTeamMembers.length);

  return {
    addResult,
    assignResult,
    manageTeamMembers,
    userCount: manageTeamMembers.length,
    licenseStatus: productInfo.licenseStatus,
    orgName: options._orgName || null,
    savedCookies,
  };
}

module.exports = {
  checkAccount,
  addUserToAccount,
  addUsersWithProduct,
  removeUserFromAccount,
  autoDeleteUsers,
};
