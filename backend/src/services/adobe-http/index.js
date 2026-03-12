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
const { getOrgId, getProducts, getProductUserEmails, getUsers, addUsers, removeUser, assignProductToUsers } = require("./adminConsole");
const { exportCookies, createHttpClient, importCookies } = require("./httpClient");

/**
 * Login + lấy org ID + org name. Nếu fast path (saved cookies) thất bại → fallback Playwright.
 * @returns {{ client, jar, accessToken, orgId, orgName }}
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

  let orgResult = await getOrgId(client, accessToken);

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

    orgResult = await getOrgId(client, accessToken);
  }

  if (!orgResult) {
    throw new Error("Không lấy được org ID sau tất cả strategies");
  }

  return { client, jar, accessToken, orgId: orgResult.orgId, orgName: orgResult.orgName };
}

/**
 * Check tài khoản Adobe: login → org → products → users.
 */
async function checkAccount(email, password, options = {}) {
  logger.info("[adobe-http] checkAccount bắt đầu: %s", email);

  try {
    const { client, jar, accessToken, orgId, orgName } = await loginAndGetOrg(email, password, options);

    const productInfo = await getProducts(client, orgId, accessToken);
    const users = await getUsers(client, orgId, accessToken);

    // Chỉ check user assignment từ paid products (loại bỏ Complimentary/CCFM)
    const paidProductIds = productInfo.products
      .filter((p) => !p.isFree && p.id)
      .map((p) => p.id);
    logger.info("[adobe-http] Paid product IDs cho user check: %s", paidProductIds.join(",") || "(none)");
    const productEmails = await getProductUserEmails(client, orgId, accessToken, paidProductIds);

    const adminEmail = email.toLowerCase().trim();
    const manageTeamMembers = users
      .filter((u) => (u.email || "").toLowerCase().trim() !== adminEmail)
      .map((u) => ({
        name: u.name,
        email: u.email || "",
        product: productEmails.has((u.email || "").toLowerCase().trim()),
      }));

    const scrapedData = {
      orgName: orgName || null,
      userCount: manageTeamMembers.length,
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

  // 4. Re-fetch users → build snapshot mới
  const users = await getUsers(client, orgId, accessToken);
  const paidProductIds = paidProducts.map((p) => p.id);
  const productEmails = await getProductUserEmails(client, orgId, accessToken, paidProductIds);

  const adminEmail = email.toLowerCase().trim();
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
