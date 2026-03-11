/**
 * Entry point cho Adobe HTTP service.
 * Interface tương thích với code cũ (RenewAdobeController).
 *
 * Luồng:
 * 1. loginViaHttp → lấy access token + cookies
 * 2. getOrgId → lấy organization ID
 * 3. getProducts → check license status
 * 4. getUsers → lấy danh sách user
 * 5. addUsers / removeUser → quản lý user
 */

const logger = require("../../utils/logger");
const { loginViaHttp } = require("./login");
const { getOrgId, getProducts, getUsers, addUsers, removeUser } = require("./adminConsole");
const { exportCookies } = require("./httpClient");

/**
 * Check tài khoản Adobe: login → lấy thông tin org, products, users.
 * Trả về dữ liệu giống scrapedData cũ để RenewAdobeController không cần đổi nhiều.
 *
 * @param {string} email
 * @param {string} password
 * @param {{ savedCookies?: Array, savedCookiesFromDb?: object }} [options]
 * @returns {Promise<{ success: boolean, scrapedData: object|null, savedCookies: object|null, error?: string }>}
 */
async function checkAccount(email, password, options = {}) {
  const savedCookies = options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const mailBackupId = options.mailBackupId || null;

  logger.info("[adobe-http] checkAccount bắt đầu: %s", email);

  const loginResult = await loginViaHttp(email, password, { savedCookies, mailBackupId });

  if (!loginResult.success) {
    logger.warn("[adobe-http] Login thất bại: %s", loginResult.error);
    return {
      success: false,
      scrapedData: null,
      savedCookies: null,
      error: loginResult.error,
      loginResults: loginResult.results,
    };
  }

  const { client, jar, accessToken } = loginResult;

  const orgId = await getOrgId(client);
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

  const cookies = exportCookies(jar);

  logger.info("[adobe-http] checkAccount xong: org=%s, users=%s, license=%s",
    orgId, users.length, productInfo.licenseStatus);

  return { success: true, scrapedData, savedCookies: cookies };
}

/**
 * Thêm user vào tài khoản Adobe.
 * @param {string} email - Email tài khoản admin
 * @param {string} password
 * @param {string[]} userEmails - Danh sách email user cần thêm
 * @param {{ savedCookies?: Array, savedCookiesFromDb?: object }} [options]
 */
async function addUserToAccount(email, password, userEmails, options = {}) {
  const savedCookies = options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const mailBackupId = options.mailBackupId || null;
  const loginResult = await loginViaHttp(email, password, { savedCookies, mailBackupId });

  if (!loginResult.success) {
    throw new Error(`Login thất bại: ${loginResult.error}`);
  }

  const { client, accessToken } = loginResult;
  const orgId = await getOrgId(client);
  if (!orgId) throw new Error("Không lấy được org ID");
  if (!accessToken) throw new Error("Không có access token để gọi API add user");

  return addUsers(client, orgId, accessToken, userEmails);
}

/**
 * Xóa user khỏi tài khoản Adobe.
 * @param {string} email - Email tài khoản admin
 * @param {string} password
 * @param {string} userEmail - Email user cần xóa
 * @param {{ savedCookies?: Array, savedCookiesFromDb?: object }} [options]
 */
async function removeUserFromAccount(email, password, userEmail, options = {}) {
  const savedCookies = options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const mailBackupId = options.mailBackupId || null;
  const loginResult = await loginViaHttp(email, password, { savedCookies, mailBackupId });

  if (!loginResult.success) {
    throw new Error(`Login thất bại: ${loginResult.error}`);
  }

  const { client, accessToken } = loginResult;
  const orgId = await getOrgId(client);
  if (!orgId) throw new Error("Không lấy được org ID");
  if (!accessToken) throw new Error("Không có access token để gọi API remove user");

  return removeUser(client, orgId, accessToken, userEmail);
}

/**
 * Xóa nhiều user (auto-delete flow).
 * @param {string} email
 * @param {string} password
 * @param {string[]} userEmails
 * @param {{ savedCookies?: Array, savedCookiesFromDb?: object }} [options]
 */
async function autoDeleteUsers(email, password, userEmails, options = {}) {
  const savedCookies = options.savedCookiesFromDb?.cookies || options.savedCookies || [];
  const mailBackupId = options.mailBackupId || null;
  const loginResult = await loginViaHttp(email, password, { savedCookies, mailBackupId });

  if (!loginResult.success) {
    throw new Error(`Login thất bại: ${loginResult.error}`);
  }

  const { client, accessToken } = loginResult;
  const orgId = await getOrgId(client);
  if (!orgId) throw new Error("Không lấy được org ID");
  if (!accessToken) throw new Error("Không có access token");

  const deleted = [];
  const failed = [];

  for (const ue of userEmails) {
    try {
      const result = await removeUser(client, orgId, accessToken, ue);
      if (result.success) {
        deleted.push(ue);
      } else {
        failed.push(ue);
      }
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
