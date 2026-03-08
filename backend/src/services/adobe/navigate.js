/**
 * Điều hướng trang: account.adobe.com, Admin Console (overview / users).
 * Chỉ thực hiện page.goto + chờ; không scrape. Gọi từng bước khi cần cho từng tính năng.
 */

const logger = require("../../utils/logger");
const {
  ACCOUNT_ADOBE_URL,
  ADMIN_CONSOLE_OVERVIEW_URL,
  ADMIN_CONSOLE_USERS_URL,
} = require("./constants");

/**
 * Vào trang Tổng quan tài khoản (account.adobe.com) — dùng khi cần lấy org_name / profile.
 * @param {import('puppeteer').Page} page - Đã đăng nhập
 */
async function navigateToAccountPage(page) {
  logger.info("[adobe] Điều hướng: account.adobe.com");
  await page.goto(ACCOUNT_ADOBE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 35000,
  });
  await new Promise((r) => setTimeout(r, 4000));
}

/**
 * Vào trang Overview Admin Console (adminconsole.adobe.com).
 * @param {import('puppeteer').Page} page - Đã đăng nhập
 */
async function navigateToAdminConsoleOverview(page) {
  logger.info("[adobe] Điều hướng: Admin Console (Overview)");
  await page.goto(ADMIN_CONSOLE_OVERVIEW_URL, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 5000));
}

/**
 * Vào trang Users Admin Console (adminconsole.adobe.com/users).
 * @param {import('puppeteer').Page} page - Đã đăng nhập
 */
async function navigateToAdminConsoleUsers(page) {
  logger.info("[adobe] Điều hướng: Admin Console (Users)");
  await page.goto(ADMIN_CONSOLE_USERS_URL, {
    waitUntil: "networkidle0",
    timeout: 30000,
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 4000));
}

module.exports = {
  navigateToAccountPage,
  navigateToAdminConsoleOverview,
  navigateToAdminConsoleUsers,
};
