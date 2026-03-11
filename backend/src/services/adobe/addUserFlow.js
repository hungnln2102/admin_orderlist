/**
 * Luồng: Login Adobe → trang Users → thêm user(s) trong một modal (1 bước) → scrape lại danh sách user.
 */

const logger = require("../../utils/logger");
const { navigateToAdminConsoleUsers } = require("./navigate");
const { addMultipleUsersOnAdminConsole } = require("./addUserOnAdminConsole");
const { scrapeAdminConsoleUsersPage } = require("./scrapers");

/**
 * Login → vào Admin Console Users → thêm nhiều user trong một modal (1 lần Save) → scrape lại.
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
 * @returns {Promise<{ users: Array<{ name: string|null, email: string, product: boolean }> }>}
 */
async function runAddUser(opts, userEmails) {
  const list = Array.isArray(userEmails) ? userEmails : [userEmails];
  const trimmed = list.map((e) => String(e).trim()).filter(Boolean);
  if (trimmed.length === 0) {
    throw new Error("Danh sách email cần thêm không được rỗng.");
  }

  logger.info("[adobe-add-user] Bắt đầu: login → users → thêm %s user → scrape lại", trimmed.length);
  const { runWithSession } = require("./index");

  const result = await runWithSession(opts, async (page) => {
    await navigateToAdminConsoleUsers(page);
    await new Promise((r) => setTimeout(r, 4000));
    await addMultipleUsersOnAdminConsole(page, trimmed);

    // Sau khi Save, chờ modal đóng + trang users reload
    await new Promise((r) => setTimeout(r, 5000));

    // Reload trang Users để lấy dữ liệu mới nhất (user mới thêm có thể chưa có gói ngay)
    logger.info("[adobe-add-user] Reload trang Users để scrape lại...");
    await navigateToAdminConsoleUsers(page);
    await new Promise((r) => setTimeout(r, 3000));

    let users = await scrapeAdminConsoleUsersPage(page).catch(() => []);
    if (users.length === 0) {
      await new Promise((r) => setTimeout(r, 4000));
      users = await scrapeAdminConsoleUsersPage(page).catch(() => []);
    }

    const manageTeamMembers = users.map((u) => ({
      name: u.name,
      email: u.email || "",
      product: !!u.product,
    }));

    logger.info("[adobe-add-user] Scrape lại xong: %s users", manageTeamMembers.length);
    return { users: manageTeamMembers };
  });

  logger.info("[adobe-add-user] Kết thúc thêm user.");
  return result;
}

module.exports = {
  runAddUser,
};
