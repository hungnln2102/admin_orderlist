/**
 * Adobe Renew V2 — Luồng lấy thông tin B10→B13.
 * Admin Console (Profile/Org switcher) → products → users.
 */

const logger = require("../../utils/logger");
const { runCheckOrgNameFlow, runCheckProductFlow, extractOrgIdFromUrl } = require("./flows/check");

const ADMIN_USERS = "https://adminconsole.adobe.com/users";

/** Giống add/delete users flow: trang users thật thường là /{orgId}@AdobeOrg/users */
function buildAdminUsersUrl(orgId) {
  const id = orgId && String(orgId).trim();
  if (id) return `https://adminconsole.adobe.com/${id}@AdobeOrg/users`;
  return ADMIN_USERS;
}

function isAdminConsoleUsersPath(url) {
  if (!url || typeof url !== "string") return false;
  if (!/adminconsole\.adobe\.com/i.test(url)) return false;
  return (
    url.includes("@AdobeOrg/users") ||
    /\/users(?:\/|$|\?|#)/i.test(url)
  );
}

const USERS_READY_SELECTOR = [
  '[data-testid^="member-email-"]',
  '[data-testid="table"]',
  '[role="grid"] [role="row"][data-key]',
  '[role="rowgroup"] [role="row"]',
  '[aria-label="Người dùng"]',
  '[aria-label="Users"]',
  '[role="grid"] [role="row"]',
  "table tbody tr",
].join(", ");

/** Chờ trang users adminconsole load xong (bảng hoặc member-email xuất hiện) trước khi scrape. */
async function waitForUsersPageReady(page, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (!isAdminConsoleUsersPath(url)) {
      await page.waitForTimeout(1200);
      continue;
    }
    const ready = await page
      .locator(USERS_READY_SELECTOR)
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (ready) {
      await page.waitForTimeout(1800);
      logger.info("[adobe-v2] B13: Trang users đã load xong");
      return;
    }
    await page.waitForTimeout(1200);
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

  const usersUrlPrimary = buildAdminUsersUrl(orgId);
  logger.info("[adobe-v2] B13: adminconsole/users (url=%s)", usersUrlPrimary.slice(0, 96));

  await page
    .goto(usersUrlPrimary, { waitUntil: "domcontentloaded", timeout: 35000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 18000 }).catch(() => {});
  await waitForUsersPageReady(page, 40000);

  let usersUrl = page.url();
  if (orgId && !isAdminConsoleUsersPath(usersUrl)) {
    logger.info("[adobe-v2] B13: Không ở route users sau goto org — thử /users gốc (redirect Adobe)");
    await page.goto(ADMIN_USERS, { waitUntil: "domcontentloaded", timeout: 35000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 18000 }).catch(() => {});
    await waitForUsersPageReady(page, 25000);
    usersUrl = page.url();
  }

  if (!isAdminConsoleUsersPath(usersUrl)) {
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
