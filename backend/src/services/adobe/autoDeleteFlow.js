/**
 * Luồng tự động: Login Adobe → truy cập trang Users (../users) → xóa lần lượt danh sách user.
 * Dùng runWithSession + navigateToAdminConsoleUsers + deleteUserOnAdminConsole.
 */

const logger = require("../../utils/logger");
const { navigateToAdminConsoleUsers } = require("./navigate");
const { deleteUserOnAdminConsole } = require("./scrapers");

const DELAY_BETWEEN_DELETES_MS = 2500;

/**
 * Trên page đã mở (đã login), vào trang Users rồi xóa lần lượt từng user theo email.
 * @param {import('puppeteer').Page} page
 * @param {string[]} userEmails - Danh sách email cần xóa (đã trim, không rỗng)
 * @returns {Promise<{ deleted: string[], failed: Array<{ email: string, error: string }> }}}
 */
async function runDeleteUsersOnPage(page, userEmails) {
  const normalized = userEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) {
    return { deleted: [], failed: [] };
  }

  await navigateToAdminConsoleUsers(page);
  await new Promise((r) => setTimeout(r, 4000));

  const deleted = [];
  const failed = [];

  for (const email of normalized) {
    try {
      await deleteUserOnAdminConsole(page, email);
      deleted.push(email);
      logger.info("[adobe-auto-delete] Đã xóa user: %s", email);
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_DELETES_MS));
    } catch (err) {
      logger.warn("[adobe-auto-delete] Xóa thất bại %s: %s", email, err.message);
      failed.push({ email, error: err.message || String(err) });
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return { deleted, failed };
}

/**
 * Login Adobe → truy cập site ../users (Admin Console Users) → chạy auto xóa từng user trong danh sách.
 *
 * @param {{
 *   email: string,
 *   password: string,
 *   cookiesFile?: string,
 *   saveCookiesTo?: string,
 *   savedCookiesFromDb?: object,
 *   mailBackupId?: number | null
 * }} opts - Credential/cookie options (giống runWithSession)
 * @param {string[]} userEmails - Danh sách email user cần xóa
 * @returns {Promise<{ deleted: string[], failed: Array<{ email: string, error: string }> }}}
 */
async function runAutoDeleteUsers(opts, userEmails) {
  const list = Array.isArray(userEmails) ? userEmails : [userEmails].filter(Boolean);
  const normalized = list.map((e) => String(e).trim()).filter(Boolean);
  if (normalized.length === 0) {
    logger.warn("[adobe-auto-delete] Danh sách userEmails rỗng.");
    return { deleted: [], failed: [] };
  }

  logger.info("[adobe-auto-delete] Bắt đầu: login → users → xóa %d user", normalized.length);
  const { runWithSession } = require("./index");
  const result = await runWithSession(opts, (page) => runDeleteUsersOnPage(page, normalized));
  logger.info("[adobe-auto-delete] Kết thúc: deleted=%d, failed=%d", result.deleted.length, result.failed.length);
  return result;
}

module.exports = {
  runAutoDeleteUsers,
  runDeleteUsersOnPage,
};
