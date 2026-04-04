/**
 * Adobe Renew V2 — Luồng lấy thông tin B10→B13.
 * Admin Console (Profile/Org switcher) → products → users.
 */

const logger = require("../../utils/logger");

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
    const ready = await page.locator([
      '[data-testid="table"]',
      '[data-testid="product-name"]',
      '[data-testid="product-name-cell"]',
      // Spectrum/ARIA based tables (UI hay đổi data-testid)
      '[role="grid"]',
      '[role="table"]',
      '[role="rowgroup"] [role="row"]',
      'table tbody tr',
      'button:has-text("Xuất sang CSV")',
      'button:has-text("Export")',
    ].join(", ")).first().waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
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

/** B10–B11: Lấy Profile/Org name ngay trên Admin Console theo docs/Renew_Adobe_Check_Flow.md */
async function runB10B11ProfileNameFromAdminConsole(page) {
  logger.info("[adobe-v2] B10: Lấy Profile từ adminconsole (org-switch-button)");

  // Đảm bảo đang ở adminconsole (products/users đều ok)
  if (!page.url().includes("adminconsole.adobe.com")) {
    await page.goto(ADMIN_PRODUCTS, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  const btn = page.locator('button[data-testid="org-switch-button"]').first();
  // Tránh case "chuyển bước quá nhanh": adminconsole shell có thể render chậm,
  // nên cần wait cho button thật sự xuất hiện.
  try {
    await btn.waitFor({ state: "visible", timeout: 15000 });
  } catch {
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) {
      logger.warn("[adobe-v2] B10–B11: Không thấy org-switch-button trên adminconsole (timeout)");
      return null;
    }
  }

  // Click để mở menu listbox
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await btn.click({ timeout: 5000 }).catch(() => {});
  // Chờ menu listbox render xong trước khi scrape text.
  await page
    .locator('[role="listbox"], [role="menu"]')
    .first()
    .waitFor({ state: "visible", timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(300);

  // Menu có role=listbox, item role=option; trong option có tag Business ID
  const name = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const list =
      document.querySelector('[role="listbox"][aria-label]') ||
      document.querySelector('[role="listbox"]') ||
      document.querySelector('[class*="Menu" i][role="listbox"]');
    if (!list) return null;

    const options = Array.from(list.querySelectorAll('[role="option"]'));
    const getLabel = (opt) => {
      const labelId = opt.getAttribute("aria-labelledby");
      if (labelId) {
        const el = document.getElementById(labelId);
        if (el) return norm(el.textContent);
      }
      return norm(opt.textContent);
    };

    // Ưu tiên dòng có tag Business ID (không phụ thuộc ngôn ngữ chính)
    for (const opt of options) {
      const txt = norm(opt.textContent);
      if (/Business\s*ID/i.test(txt)) {
        // lấy phần trước "Business ID"
        return getLabel(opt).replace(/Business\s*ID.*$/i, "").trim() || getLabel(opt);
      }
    }
    // Fallback: chọn option đang selected
    const selected = options.find((o) => o.getAttribute("aria-selected") === "true") || options[0];
    if (!selected) return null;
    return getLabel(selected);
  }).catch(() => null);

  if (name) {
    logger.info("[adobe-v2] B11: Profile Name (adminconsole org switch) = %s", name);
    return name;
  }

  logger.warn("[adobe-v2] B10–B11: Không lấy được Profile Name từ org switch menu");
  return null;
}

function scrapeProductsPage(page) {
  return page.evaluate(() => {
    const out = [];
    const parseUsage = (text) => {
      const t = (text || "").replace(/\s+/g, " ").trim();
      const m = t.match(/(\d+)\s*(?:trên|of|\/)\s*(\d+)/i) || t.match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return { used: 0, total: 0 };
      return { used: parseInt(m[1], 10) || 0, total: parseInt(m[2], 10) || 0 };
    };

    // Strategy A: data-testid (old UI)
    const rowsA = document.querySelectorAll('[data-testid="table"] [role="row"][data-key]');
    for (const row of rowsA) {
      const nameEl = row.querySelector('[data-testid="product-name"]');
      const name = nameEl ? nameEl.textContent?.trim() : null;
      const usageEl = row.querySelector('[data-testid="quantity-usage"]');
      const unitEl = row.querySelector('[data-testid="unit-name"]');
      const { used, total } = parseUsage(usageEl ? usageEl.textContent : "");
      const unit = unitEl ? unitEl.textContent?.trim() : "";
      if (name) out.push({ name, used, total, unit });
    }
    if (out.length > 0) return out;

    // Strategy B: ARIA grid/table (new UI)
    const gridRows = Array.from(document.querySelectorAll('[role="rowgroup"] [role="row"], [role="grid"] [role="row"], [role="table"] [role="row"]'))
      .filter((r) => r && r.textContent && r.textContent.trim().length > 0);
    for (const row of gridRows) {
      const txt = (row.textContent || "").replace(/\s+/g, " ").trim();
      // Bỏ qua header row (thường chứa "Tên", "Số lượng"...)
      if (/^\s*(tên|name)\b/i.test(txt) && /(số lượng|quantity|thẻ|status)/i.test(txt)) continue;
      const usageMatch = txt.match(/(\d+)\s*(?:trên|of|\/)\s*(\d+)/i) || txt.match(/(\d+)\s*\/\s*(\d+)/);
      const { used, total } = parseUsage(usageMatch ? usageMatch[0] : "");
      if (!usageMatch) continue;
      // Name: lấy phần trước usage
      const idx = txt.toLowerCase().indexOf(usageMatch[0].toLowerCase());
      const name = (idx > 0 ? txt.slice(0, idx) : txt).trim();
      if (name) out.push({ name, used, total, unit: "" });
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
  let org_name = existingOrgName;
  let orgId = null;
  let products = [];
  let users = [];
  let license_status = "unknown";

  if (existingOrgName) {
    logger.info("[adobe-v2] B10–B11: Bỏ qua (đã có org_name=%s)", existingOrgName);
  } else {
    try {
      org_name = await runB10B11ProfileNameFromAdminConsole(page);
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

  // Xác định license_status:
  // - Có ít nhất 1 product quota > 0 → "Paid" (còn gói)
  // - Có products nhưng tất cả quota = 0 → "Expired" (hết gói rõ ràng)
  // - Không có products (scrape ra rỗng):
  //    + Nếu vẫn ở đúng URL adminconsole/products → tài khoản hết hạn, Adobe không hiển thị products → "Expired"
  //    + Nếu bị redirect ra ngoài (login page, trang khác) → scrape thật sự thất bại → "unknown"
  const onProductsPage = productsUrl.includes("adminconsole.adobe.com") && productsUrl.includes("/products");
  if (products.length === 0) {
    license_status = onProductsPage ? "Expired" : "unknown";
  } else {
    license_status = products.some((p) => (p.total || 0) > 0) ? "Paid" : "Expired";
  }
  logger.info("[adobe-v2] products: %d, license_status: %s, orgId: %s, onProductsPage: %s",
    products.length, license_status, orgId || "(null)", onProductsPage);

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
