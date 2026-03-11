/**
 * Entry point cho Adobe HTTP service.
 *
 * Luồng:
 * 1. loginViaHttp → lấy access token + cookies (Playwright nếu cần)
 * 2. getOrgId → lấy organization ID
 * 3. getProducts / getUsers / addUsers / removeUser → HTTP operations
 *
 * Nếu saved cookies + token hợp lệ → KHÔNG mở browser.
 * Nếu hết hạn → Playwright headless login ~15-30s → save session mới.
 */

const logger = require("../../utils/logger");
const { loginViaHttp } = require("./login");
const { loginWithPlaywright } = require("./loginBrowser");
const { getOrgId, getProducts, getUsers, addUsers, removeUser } = require("./adminConsole");
const { exportCookies, createHttpClient, importCookies } = require("./httpClient");

/**
 * Login + lấy org ID. Nếu fast path (saved cookies) thất bại → fallback Playwright.
 * @returns {{ client, jar, accessToken, orgId }}
 */
async function loginAndGetOrg(email, password, options = {}) {
  const savedCookies = options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const savedAccessToken = options.savedCookiesFromDb?.accessToken || null;
  const mailBackupId = options.mailBackupId || null;

  const loginResult = await loginViaHttp(email, password, {
    savedCookies,
    savedAccessToken,
    mailBackupId,
  });

  if (!loginResult.success) {
    throw new Error(loginResult.error || "Login thất bại");
  }

  let { client, jar, accessToken, usedBrowser } = loginResult;

  let orgId = await getOrgId(client, accessToken);

  // Chỉ retry Playwright nếu chưa dùng browser (fast path thất bại lấy org)
  if (!orgId && !usedBrowser) {
    logger.info("[adobe-http] Org=%s → fast path không lấy được org, chuyển Playwright...",
      orgId || "null");

    const browserResult = await loginWithPlaywright(email, password, { savedCookies, mailBackupId });
    if (!browserResult.success) {
      throw new Error(browserResult.error || "Playwright login thất bại");
    }

    const fresh = createHttpClient();
    client = fresh.client;
    jar = fresh.jar;
    await importCookies(jar, browserResult.cookies);
    accessToken = browserResult.accessToken;

    orgId = await getOrgId(client, accessToken);
  }

  if (!orgId) {
    throw new Error("Không lấy được org ID sau tất cả strategies");
  }

  return { client, jar, accessToken, orgId };
}

/**
 * Check tài khoản Adobe: login → org → products → users.
 */
async function checkAccount(email, password, options = {}) {
  logger.info("[adobe-http] checkAccount bắt đầu: %s", email);

  try {
    const { client, jar, accessToken, orgId } = await loginAndGetOrg(email, password, options);

    const productInfo = await getProducts(client, orgId, accessToken);
    const users = await getUsers(client, orgId, accessToken);

    const manageTeamMembers = users.map((u) => ({
      name: u.name,
      email: u.email || "",
      product: !!u.product,
    }));

    const scrapedData = {
      orgName: null,
      userCount: users.length,
      licenseStatus: productInfo.licenseStatus,
      adobe_org_id: orgId,
      profileName: null,
      manageTeamMembers,
      adminConsoleUsers: users,
    };

    // Save cookies + access token cùng nhau
    const savedCookies = exportCookies(jar);
    savedCookies.accessToken = accessToken;

    logger.info("[adobe-http] checkAccount xong: org=%s, users=%s, license=%s",
      orgId, users.length, productInfo.licenseStatus);

    return { success: true, scrapedData, savedCookies };
  } catch (err) {
    logger.warn("[adobe-http] checkAccount lỗi: %s", err.message);
    return { success: false, scrapedData: null, savedCookies: null, error: err.message };
  }
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
 * Xóa nhiều user (auto-delete flow).
 */
async function autoDeleteUsers(email, password, userEmails, options = {}) {
  const { client, accessToken, orgId } = await loginAndGetOrg(email, password, options);
  if (!accessToken) throw new Error("Không có access token");

  const deleted = [];
  const failed = [];

  for (const ue of userEmails) {
    try {
      const result = await removeUser(client, orgId, accessToken, ue);
      if (result.success) { deleted.push(ue); }
      else { failed.push(ue); }
    } catch (e) {
      logger.warn("[adobe-http] Delete user %s failed: %s", ue, e.message);
      failed.push(ue);
    }
  }

  return { deleted, failed };
}

module.exports = {
  checkAccount,
  addUserToAccount,
  removeUserFromAccount,
  autoDeleteUsers,
};
