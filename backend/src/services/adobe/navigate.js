/**
 * Điều hướng trang: account.adobe.com, Admin Console (overview / users).
 * Chỉ thực hiện page.goto + chờ; không scrape. Gọi từng bước khi cần cho từng tính năng.
 */

const logger = require("../../utils/logger");
const {
  ACCOUNT_ADOBE_URL,
  ADMIN_CONSOLE_OVERVIEW_URL,
  ADMIN_CONSOLE_PRODUCTS_URL,
  ADMIN_CONSOLE_USERS_URL,
  ADMIN_CONSOLE_USERS_ADMINISTRATORS_URL,
  ADMIN_CONSOLE_AUTO_ASSIGN_URL,
} = require("./constants");

/**
 * Vào trang Tổng quan tài khoản (account.adobe.com) — dùng khi cần lấy org_name / profile.
 * @param {import('puppeteer').Page} page - Đã đăng nhập
 */
async function navigateToAccountPage(page) {
  logger.info("[adobe] Điều hướng: account.adobe.com");
  await page.goto(ACCOUNT_ADOBE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 55000,
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
    timeout: 50000,
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 5000));
}

/**
 * Vào trang Products Admin Console (adminconsole.adobe.com/products) — kiểm tra có sản phẩm/gói.
 * Chờ nội dung trang xuất hiện (Tất cả sản phẩm / Không có sản phẩm) rồi mới trả về.
 * @param {import('puppeteer').Page} page - Đã đăng nhập
 */
async function navigateToAdminConsoleProducts(page) {
  logger.info("[adobe] Điều hướng: Admin Console (Products)");
  await page.goto(ADMIN_CONSOLE_PRODUCTS_URL, {
    waitUntil: "domcontentloaded",
    timeout: 55000,
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 5000));
  try {
    await page.waitForFunction(
      () => {
        const t = (document.body && document.body.innerText) || "";
        return /Tất cả sản phẩm|Không có sản phẩm|No products|All products/i.test(t);
      },
      { timeout: 20000 }
    );
    await new Promise((r) => setTimeout(r, 3000));
  } catch (e) {
    logger.warn("[adobe] Chờ nội dung Products timeout, tiếp tục: %s", e.message);
  }
}

/**
 * Vào trang Users Admin Console (adminconsole.adobe.com/users).
 * Chờ bảng users (div[role="row"] + gridcell) xuất hiện rồi mới trả về để scrape không bị 0.
 * @param {import('puppeteer').Page} page - Đã đăng nhập
 */
async function navigateToAdminConsoleUsers(page) {
  logger.info("[adobe] Điều hướng: Admin Console (Users)");
  await page.goto(ADMIN_CONSOLE_USERS_URL, {
    waitUntil: "domcontentloaded",
    timeout: 55000,
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 5000));
  try {
    await page.waitForFunction(
      () => {
        const rows = document.querySelectorAll('div[role="row"]');
        for (const row of rows) {
          if (row.querySelector('div[role="gridcell"]')) return true;
        }
        return false;
      },
      { timeout: 20000 }
    );
    await new Promise((r) => setTimeout(r, 2000));
  } catch (e) {
    logger.warn("[adobe] Chờ bảng Users timeout, scrape có thể ra 0: %s", e.message);
  }
}

/**
 * Vào trang Users > Administrators (adminconsole.adobe.com/users/administrators) — dùng cho flow xóa product.
 * Chờ đến khi nút "Xem chi tiết" xuất hiện mới trả về, tránh chuyển sang bước sau khi trang chưa sẵn sàng.
 * @param {import('puppeteer').Page} page - Đã đăng nhập
 */
async function navigateToAdminConsoleUsersAdministrators(page) {
  logger.info("[adobe] Điều hướng: Admin Console (Users / Administrators)");
  await page.goto(ADMIN_CONSOLE_USERS_ADMINISTRATORS_URL, {
    waitUntil: "domcontentloaded",
    timeout: 55000,
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 5000));
  try {
    await page.waitForSelector(
      'button[aria-label^="Xem chi tiết"], button[aria-label^="View details"]',
      { visible: true, timeout: 30000 }
    );
    await new Promise((r) => setTimeout(r, 2000));
    logger.info("[adobe] Trang Administrators đã sẵn sàng (có nút Xem chi tiết)");
  } catch (e) {
    logger.warn("[adobe] Chờ nút Xem chi tiết trên Administrators timeout: %s", e.message);
  }
}

/**
 * Vào trang Auto-assign products (adminconsole.adobe.com/products/auto-assign) — dùng khi cần lấy URL truy cập sản phẩm.
 * Chờ trang load xong (có nút Add product) rồi mới trả về để tránh flow chạy khi DOM chưa sẵn sàng.
 * @param {import('puppeteer').Page} page - Đã đăng nhập
 */
async function navigateToAdminConsoleAutoAssign(page) {
  logger.info("[adobe] Điều hướng: Admin Console (Auto-assign)");
  await page.goto(ADMIN_CONSOLE_AUTO_ASSIGN_URL, {
    waitUntil: "domcontentloaded",
    timeout: 55000,
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));
  try {
    await page.waitForSelector('button[data-variant="accent"]', { visible: true, timeout: 25000 });
    await new Promise((r) => setTimeout(r, 2000));
  } catch (e) {
    logger.warn("[adobe] Chờ nút Add product trên auto-assign timeout: %s", e.message);
  }
}

module.exports = {
  navigateToAccountPage,
  navigateToAdminConsoleOverview,
  navigateToAdminConsoleProducts,
  navigateToAdminConsoleUsers,
  navigateToAdminConsoleUsersAdministrators,
  navigateToAdminConsoleAutoAssign,
};
