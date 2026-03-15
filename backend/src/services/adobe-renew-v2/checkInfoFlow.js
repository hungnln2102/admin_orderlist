/**
 * Adobe Renew V2 — Luồng lấy thông tin B10→B13.
 * account.adobe.com (Profile Name) → adminconsole products → users.
 */

const logger = require("../../utils/logger");

const ACCOUNT_ADOBE = "https://account.adobe.com/";
const ADMIN_PRODUCTS = "https://adminconsole.adobe.com/products";
const ADMIN_USERS = "https://adminconsole.adobe.com/users";

/** Trích orgId từ URL adminconsole (ví dụ /3845271F6998B7450A495E98@AdobeOrg/products) */
function extractOrgIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/\/([A-Fa-f0-9]{20,})@AdobeOrg/);
  return m ? m[1] : null;
}

/** Chờ trang products adminconsole load xong (bảng hoặc product-name xuất hiện) trước khi scrape. */
async function waitForProductsPageReady(page, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (!url.includes("adminconsole.adobe.com") || !url.includes("/products")) {
      await page.waitForTimeout(1500);
      continue;
    }
    const ready = await page.locator('[data-testid="table"], [data-testid="product-name"], [data-testid="product-name-cell"]').first().waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
    if (ready) {
      await page.waitForTimeout(1500);
      logger.info("[adobe-v2] B12: Trang products đã load xong");
      return;
    }
    await page.waitForTimeout(1500);
  }
  logger.warn("[adobe-v2] B12: Timeout chờ trang products (vẫn scrape thử)");
}

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

/** Đảm bảo đang ở account.adobe.com và trang đã load (cho B10–B11). */
async function ensureAccountAdobePage(page) {
  const url = page.url();
  if (!url.includes("account.adobe.com") || url.includes("auth.")) {
    logger.info("[adobe-v2] Navigate tới account.adobe.com...");
    await page.goto(ACCOUNT_ADOBE, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

/** B10: Bấm mở menu profile. B11: Lấy Profile Name từ panel. */
async function runB10B11ProfileName(page) {
  let org_name = null;

  logger.info("[adobe-v2] B10: Bấm menu profile (account.adobe.com)");
  const triggerSelectors = [
    '#unav-profile',
    '[data-test-id="unav-profile"]',
    'account-menu-trigger',
    'div.unav-comp-external-profile',
    '[class*="unav-profile"]',
  ];
  let clicked = false;
  for (const sel of triggerSelectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: "visible", timeout: 5000 });
      await el.click({ timeout: 3000 });
      clicked = true;
      logger.info("[adobe-v2] B10: Đã click trigger: %s", sel);
      break;
    } catch (_) {}
  }
  if (!clicked) {
    try {
      await page.getByRole("button", { name: /profile|account|hồ sơ/i }).first().click({ timeout: 5000 });
      clicked = true;
    } catch (_) {}
  }

  if (clicked) {
    await page.waitForTimeout(2000);
    logger.info("[adobe-v2] B11: Lấy Profile Name từ panel...");
    const nameSelectors = [
      'h3.app__switchProfileName___qL7wd',
      '.app__switchProfileName___qL7wd',
      '[class*="switchProfileName"]',
      '[class*="switchProfileContainer"] h3',
      '[data-testid="mini-app-profile-switcher-open-button"]',
    ];
    for (const sel of nameSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          const text = await el.textContent().then((t) => t?.trim() || null).catch(() => null);
          if (text && text.length > 0 && !/chuyển hồ sơ|switch profile/i.test(text)) {
            org_name = text;
            logger.info("[adobe-v2] B11: Profile Name = %s (selector: %s)", org_name, sel);
            break;
          }
          if (sel.includes("mini-app-profile-switcher")) {
            const container = el.locator("..");
            const h3 = container.locator("h3").first();
            if (await h3.isVisible().catch(() => false)) {
              org_name = await h3.textContent().then((t) => t?.trim() || null).catch(() => null);
              if (org_name) { logger.info("[adobe-v2] B11: Profile Name = %s (từ h3 cạnh nút)", org_name); break; }
            }
          }
        }
      } catch (_) {}
    }
    if (!org_name) {
      org_name = await page.evaluate(() => {
        const h3 = document.querySelector('h3[class*="switchProfileName"], .app__switchProfileName___qL7wd, [class*="switchProfileName"]');
        if (h3) return (h3.textContent || "").trim() || null;
        for (const el of document.querySelectorAll("[class*='switchProfile'], [class*='ProfileName']")) {
          const t = (el.textContent || "").trim();
          if (t && t.length < 100 && !/chuyển|switch/i.test(t)) return t;
        }
        return null;
      }).catch(() => null);
      if (org_name) logger.info("[adobe-v2] B11: Profile Name (evaluate) = %s", org_name);
    }
  }

  if (!org_name) logger.warn("[adobe-v2] B10–B11: Không lấy được Profile Name (panel có thể chưa mở hoặc selector đổi)");
  return org_name;
}

function scrapeProductsPage(page) {
  return page.evaluate(() => {
    const rows = document.querySelectorAll('[data-testid="table"] [role="row"][data-key]');
    const out = [];
    for (const row of rows) {
      const nameEl = row.querySelector('[data-testid="product-name"]');
      const name = nameEl ? nameEl.textContent?.trim() : null;
      const usageEl = row.querySelector('[data-testid="quantity-usage"]');
      const unitEl = row.querySelector('[data-testid="unit-name"]');
      let used = 0, total = 0;
      if (usageEl) {
        const text = usageEl.textContent || "";
        const m = text.match(/(\d+)\s*(?:trên|of|\/)\s*(\d+)/i) || text.match(/(\d+)\s*\/\s*(\d+)/);
        if (m) { used = parseInt(m[1], 10); total = parseInt(m[2], 10); }
      }
      const unit = unitEl ? unitEl.textContent?.trim() : "";
      if (name) out.push({ name, used, total, unit });
    }
    return out;
  }).catch(() => []);
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
      const hasProduct = row ? !!row.querySelector('[data-testid="image-icon"], [data-testid="tooltip-button-action"]') : false;
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
  let org_name = existingOrgName;
  let orgId = null;
  let products = [];
  let users = [];
  let license_status = "unknown";

  if (existingOrgName) {
    logger.info("[adobe-v2] B10–B11: Bỏ qua (đã có org_name=%s)", existingOrgName);
  } else {
    try {
      org_name = await runB10B11ProfileName(page);
    } catch (e) {
      logger.warn("[adobe-v2] B10–B11: %s", e.message);
    }
  }

  logger.info("[adobe-v2] B12: adminconsole/products");
  await page.goto(ADMIN_PRODUCTS, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await waitForProductsPageReady(page, 20000);
  const productsUrl = page.url();
  if (!productsUrl.includes("adminconsole.adobe.com") || !productsUrl.includes("/products")) {
    logger.warn("[adobe-v2] B12: URL đã đổi sau khi load (redirect?), url=%s", productsUrl.slice(0, 100));
  }
  orgId = extractOrgIdFromUrl(productsUrl);
  products = await scrapeProductsPage(page);
  license_status = products.length === 0 ? "Expired" : (products.some((p) => (p.used || 0) < (p.total || 0)) ? "Paid" : "Expired");
  logger.info("[adobe-v2] products: %d, license_status: %s, orgId: %s", products.length, license_status, orgId || "(null)");

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
  ensureAccountAdobePage,
  runB10ToB13,
};
