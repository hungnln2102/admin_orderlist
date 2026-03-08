/**
 * Luồng: Login Adobe → trang Users → thêm user(s) trong một modal (1 bước).
 */

const logger = require("../../utils/logger");
const { navigateToAdminConsoleUsers } = require("./navigate");
const { addMultipleUsersOnAdminConsole } = require("./addUserOnAdminConsole");

/**
 * Login → vào Admin Console Users → thêm nhiều user trong một modal (1 lần Save).
 *
 * @param {{
 *   email: string,
 *   password: string,
 *   cookiesFile?: string,
 *   saveCookiesTo?: string,
 *   savedCookiesFromDb?: object,
 *   mailBackupId?: number | null
 * }} opts - Credential/cookie (giống runWithSession)
 * @param {string|string[]} userEmails - Email hoặc mảng email cần thêm
 * @returns {Promise<void>}
 */
async function runAddUser(opts, userEmails) {
  const list = Array.isArray(userEmails) ? userEmails : [userEmails];
  const trimmed = list.map((e) => String(e).trim()).filter(Boolean);
  if (trimmed.length === 0) {
    throw new Error("Danh sách email cần thêm không được rỗng.");
  }

  logger.info("[adobe-add-user] Bắt đầu: login → users → thêm %s user", trimmed.length);
  const { runWithSession } = require("./index");

  await runWithSession(opts, async (page) => {
    await navigateToAdminConsoleUsers(page);
    await new Promise((r) => setTimeout(r, 4000));
    await addMultipleUsersOnAdminConsole(page, trimmed);
  });

  logger.info("[adobe-add-user] Kết thúc thêm user.");
}

module.exports = {
  runAddUser,
};
