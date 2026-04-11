/**
 * Adobe Renew V2 — Luồng lấy thông tin B10→B13.
 * Admin Console (Profile/Org switcher) → products → users.
 */

const logger = require("../../utils/logger");
const { runCheckOrgNameFlow, runCheckProductFlow, extractOrgIdFromUrl } = require("./flows/check");

const ADMIN_USERS = "https://adminconsole.adobe.com/users";

/** Chờ trang users adminconsole load xong (bảng hoặc member-email xuất hiện) trước khi scrape. */
async function waitForUsersPageReady(page, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (!url.includes("adminconsole.adobe.com") || !url.includes("/users")) {
      await page.waitForTimeout(1500);
      continue;
    }
    const ready = await page.locator('[data-testid="table"], [data-testid^="member-email-"]').first().waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
    if (ready) {
      await page.waitForTimeout(1500);
      logger.info("[adobe-v2] B13: Trang users đã load xong");
      return;
    }
    await page.waitForTimeout(1500);
  }
  logger.warn("[adobe-v2] B13: Timeout chờ trang users (vẫn scrape thử)");
}


function scrapeUsersPage(page) {
  return page.evaluate(() => {
    const out = [];
    const emailEls = document.querySelectorAll('[data-testid^="member-email-"]');
    for (const el of emailEls) {
      const email = el.textContent?.trim() || "";
      const row = el.closest('[role="row"]');
      let name = "";
      if (row) {
        const nameLink = row.querySelector('a.spectrum-Link--primary, a[href*="/users/"]');
        if (nameLink) name = nameLink.textContent?.trim() || "";
      }
      // Chỉ đọc cột Sản phẩm (ô [role=gridcell] cuối). Không dùng tooltip-button-action trên cả hàng —
      // Adobe hay đặt control đó ở cột khác → false positive "có gói" khi cột sản phẩm trống.
      let hasProduct = false;
      if (row) {
        const cells = row.querySelectorAll('[role="gridcell"]');
        const productCell = cells.length ? cells[cells.length - 1] : null;
        if (productCell) {
          hasProduct = !!(
            productCell.querySelector('[data-testid="image-icon"]') ||
            productCell.querySelector("img")
          );
        }
      }
      out.push({ name, email, hasProduct });
    }
    return out;
  }).catch(() => []);
}

/**
 * B10–B13: Profile name (account.adobe.com) → products → users (adminconsole).
 * Nếu options.existingOrgName có sẵn thì bỏ qua B10–B11 (không vào account.adobe.com lấy profile).
 * @param {import('playwright').Page} page
 * @param {{ existingOrgName?: string|null }} options
 * @returns {Promise<{ org_name: string|null, orgId: string|null, license_status: string, products: any[], users: any[] }>}
 */
async function runB10ToB13(page, options = {}) {
  const existingOrgName = options.existingOrgName && String(options.existingOrgName).trim() ? String(options.existingOrgName).trim() : null;
  let org_name = null;
  let orgId = null;
  let products = [];
  let users = [];
  let license_status = "unknown";

  const orgResult = await runCheckOrgNameFlow(page, { existingOrgName });
  org_name = orgResult.org_name;

  const productResult = await runCheckProductFlow(page);
  orgId = productResult.orgId || orgId;
  products = productResult.products || [];
  license_status = productResult.license_status || "unknown";

  logger.info("[adobe-v2] B13: adminconsole/users");
  await page.goto(ADMIN_USERS, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await waitForUsersPageReady(page, 20000);
  const usersUrl = page.url();
  if (!usersUrl.includes("adminconsole.adobe.com") || !usersUrl.includes("/users")) {
    logger.warn("[adobe-v2] B13: URL đã đổi sau khi load (redirect?), url=%s", usersUrl.slice(0, 100));
  }
  if (!orgId) orgId = extractOrgIdFromUrl(page.url());
  users = await scrapeUsersPage(page);
  logger.info("[adobe-v2] users: %d", users.length);

  return { org_name, orgId, license_status, products, users };
}

module.exports = {
  runB10ToB13,
};
