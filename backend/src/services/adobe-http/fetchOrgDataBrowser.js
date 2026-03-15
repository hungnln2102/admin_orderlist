/**
 * fetchOrgDataBrowser.js
 *
 * Lấy dữ liệu org/products/users ngay trong Playwright browser session.
 * Tận dụng session cookies hợp lệ — không cần token riêng sau khi đóng browser.
 *
 * 3 chiến lược theo thứ tự ưu tiên:
 * 1. page.on('response') — intercept JIL API responses khi SPA navigate
 * 2. page.evaluate(fetch) — gọi API trong browser context với nhiều x-api-key
 * 3. DOM read — đọc trực tiếp nội dung trang products (không cần API)
 */

const logger = require("../../utils/logger");
const { TIMEOUTS } = require("./constants");

const JIL_BASE = "https://bps-il.adobe.io";
const NAV_TIMEOUT = TIMEOUTS.NAVIGATE || 20000;

/**
 * @param {import('playwright').Page} page - Playwright page đang ở Admin Console
 * @param {string} orgId
 * @param {string} accessToken
 * @returns {{ orgName, products, licenseStatus, users, productEmails }}
 */
async function fetchOrgDataInBrowser(page, orgId, accessToken) {
  const orgRef = `${orgId}@AdobeOrg`;

  const intercepted = {
    organizations: null,
    products: null,
    users: null,
    productUsers: {},
  };

  // ── Strategy 1: page.on('response') — event-based, không block traffic ──
  const responseHandler = async (response) => {
    const url = response.url();
    if (!url.includes("bps-il.adobe.io")) return;
    if (response.status() !== 200) return;
    try {
      const body = await response.json().catch(() => null);
      if (!body) return;

      if (url.includes("/organizations") && !url.includes("/products") && !url.includes("/users")) {
        intercepted.organizations = body;
        logger.info("[fetch-org] Captured organizations");
      } else if (url.match(/\/organizations\/[^/]+\/products$/) && !url.includes("/users")) {
        intercepted.products = body;
        logger.info("[fetch-org] Captured products: %s items",
          Array.isArray(body) ? body.length : (body.products?.length ?? "?"));
      } else if (url.match(/\/organizations\/[^/]+\/users$/)) {
        intercepted.users = body;
        logger.info("[fetch-org] Captured users: %s items",
          Array.isArray(body) ? body.length : (body.users?.length ?? "?"));
      } else if (url.match(/\/products\/[^/]+\/users/)) {
        const m = url.match(/\/products\/([^/]+)\/users/);
        if (m) intercepted.productUsers[m[1]] = body;
      }
    } catch (_) {}
  };
  page.on("response", responseHandler);

  try {
    logger.info("[fetch-org] Navigate overview → products → users...");

    await page.goto(`https://adminconsole.adobe.com/${orgRef}/overview`,
      { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT }).catch(() => {});
    await page.waitForResponse(r => r.url().includes("bps-il.adobe.io"), { timeout: 8000 })
      .catch(() => {});
    await page.waitForTimeout(1500);

    await page.goto(`https://adminconsole.adobe.com/${orgRef}/products`,
      { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT }).catch(() => {});
    await page.waitForResponse(
      r => r.url().includes("bps-il.adobe.io") && r.url().includes("/products"), { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);

    await page.goto(`https://adminconsole.adobe.com/${orgRef}/users`,
      { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT }).catch(() => {});
    await page.waitForResponse(
      r => r.url().includes("bps-il.adobe.io") && r.url().includes("/users"), { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);

    logger.info("[fetch-org] Sau navigation: orgs=%s, products=%s, users=%s",
      !!intercepted.organizations, !!intercepted.products, !!intercepted.users);
  } finally {
    page.off("response", responseHandler);
  }

  // ── Parse intercepted ──
  let orgName = null;
  let products = [];
  let licenseStatus = "unknown";
  let users = [];
  const productEmails = new Set();

  if (intercepted.organizations) {
    const orgs = Array.isArray(intercepted.organizations)
      ? intercepted.organizations : [intercepted.organizations];
    for (const org of orgs) {
      const id = (org.orgId || org.id || org.orgRef || "").replace(/@AdobeOrg$/, "");
      if (id === orgId) { orgName = org.name || org.orgName || org.displayName || null; break; }
      if (!orgName) orgName = org.name || org.displayName || null;
    }
  }

  if (intercepted.products) {
    products = parseProducts(intercepted.products);
    licenseStatus = calcLicenseStatus(products);
  }

  if (intercepted.users) {
    users = parseUsers(intercepted.users);
  }

  for (const [, body] of Object.entries(intercepted.productUsers)) {
    const raw = Array.isArray(body) ? body : body.users || body.items || [];
    for (const u of raw) {
      const em = (u.email || u.username || "").toLowerCase().trim();
      if (em) productEmails.add(em);
    }
  }

  // ── Strategy 2: page.evaluate fallback ──
  if (products.length === 0 || users.length === 0) {
    logger.info("[fetch-org] Interception không đủ → page.evaluate fetch...");
    const evalResult = await page.evaluate(async ({ jilBase, oRef, token }) => {
      const tryFetch = async (url, apiKey) => {
        try {
          const r = await fetch(url, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "x-api-key": apiKey },
            credentials: "include",
          });
          if (r.ok) return r.json();
        } catch (_) {}
        return null;
      };
      const apiKeys = ["ONESIE1", "aac_manage_teams", "AdobeAnalyticsUI"];
      const safeJson = async (path) => {
        for (const key of apiKeys) {
          const d = await tryFetch(`${jilBase}${path}`, key);
          if (d) return d;
        }
        return null;
      };
      const [prods, usrs, orgs] = await Promise.all([
        safeJson(`/jil-api/v2/organizations/${oRef}/products`),
        safeJson(`/jil-api/v2/organizations/${oRef}/users`),
        safeJson(`/jil-api/v2/organizations`),
      ]);
      return { prods, usrs, orgs };
    }, { jilBase: JIL_BASE, oRef: orgRef, token: accessToken }).catch(e => {
      logger.warn("[fetch-org] page.evaluate error: %s", e.message);
      return null;
    });

    if (evalResult) {
      if (!orgName && evalResult.orgs) {
        const orgsArr = Array.isArray(evalResult.orgs) ? evalResult.orgs : [evalResult.orgs];
        for (const org of orgsArr) {
          const id = (org.orgId || org.id || "").replace(/@AdobeOrg$/, "");
          if (id === orgId) { orgName = org.name || org.displayName || null; break; }
          if (!orgName) orgName = org.name || org.displayName || null;
        }
      }
      if (products.length === 0 && evalResult.prods) {
        products = parseProducts(evalResult.prods);
        if (products.length > 0) licenseStatus = calcLicenseStatus(products);
        logger.info("[fetch-org] eval products: %d", products.length);
      }
      if (users.length === 0 && evalResult.usrs) {
        users = parseUsers(evalResult.usrs);
        logger.info("[fetch-org] eval users: %d", users.length);
      }
    }
  }

  // ── Strategy 3: DOM fallback ──
  if (licenseStatus === "unknown" || products.length === 0) {
    logger.info("[fetch-org] Strategy 3: DOM read từ trang products...");
    try {
      if (!page.url().includes("/products")) {
        await page.goto(`https://adminconsole.adobe.com/${orgRef}/products`,
          { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);
      }
      const dom = await page.evaluate(() => {
        const text = (document.body?.innerText || "").toLowerCase();
        const html = document.body?.innerHTML || "";
        const isEmpty = text.includes("không có sản phẩm") || text.includes("no products") ||
          html.includes("empty-state") || html.includes("emptyState");
        const hasProducts = !isEmpty && (
          !!document.querySelector("[class*='product-name'],[class*='productName'],table tbody tr,[class*='product-row']") ||
          text.includes("giấy phép") || text.includes("license") || text.includes("creative cloud")
        );
        const productNames = [];
        document.querySelectorAll("[class*='product-name'],[class*='productName']").forEach(el => {
          const t = el.textContent?.trim();
          if (t && t.length > 2) productNames.push(t);
        });
        return { isEmpty, hasProducts, productNames };
      });

      logger.info("[fetch-org] DOM: isEmpty=%s, hasProducts=%s", dom.isEmpty, dom.hasProducts);
      if (dom.isEmpty) {
        licenseStatus = "Expired";
      } else if (dom.hasProducts) {
        licenseStatus = "Paid";
        if (products.length === 0 && dom.productNames.length > 0) {
          products = dom.productNames.map((name, i) => ({ id: `dom-${i}`, code: "", name, licenseQuota: 1, isFree: false }));
        }
      }
    } catch (e) {
      logger.warn("[fetch-org] DOM error: %s", e.message);
    }
  }

  // Product emails từ users nếu còn trống
  if (productEmails.size === 0) {
    for (const u of users) {
      if (u.product === true || (Array.isArray(u.products) && u.products.length > 0)) {
        const em = (u.email || "").toLowerCase().trim();
        if (em) productEmails.add(em);
      }
    }
  }

  logger.info("[fetch-org] Final: orgName=%s, products=%d, users=%d, license=%s",
    orgName || "(null)", products.length, users.length, licenseStatus);

  return { orgName, products, licenseStatus, users, productEmails: [...productEmails] };
}

// ────────────────── Helpers ──────────────────

function parseProducts(raw) {
  const list = Array.isArray(raw) ? raw : raw.products || raw.items || [];
  return list.map((p) => {
    const code = p.code || "";
    const name = p.shortName || p.name || p.productName || p.longName || code;
    const isFree = /complimentary|free\s+membership/i.test(name) || code === "CCFM";
    let quota = p.assignedQuantity || p.licenseQuota || p.totalQuantity || p.seats || 0;
    if (quota === 0 && Array.isArray(p.licenseGroupSummaries)) {
      for (const lg of p.licenseGroupSummaries)
        quota = Math.max(quota, lg.assignedQuantity || lg.totalQuantity || 0);
    }
    return { id: p.id || p.code, code, name, licenseQuota: quota, isFree };
  });
}

function parseUsers(raw) {
  const list = Array.isArray(raw) ? raw : raw.users || raw.items || raw.resources || [];
  return list.map(u => ({
    email: u.email || u.username || "",
    name: u.name || (u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : "") || "",
  }));
}

function calcLicenseStatus(products) {
  const paid = products.filter(p => !p.isFree);
  return paid.length > 0 && paid.some(p => (p.licenseQuota || 0) > 0) ? "Paid" : "Expired";
}

module.exports = { fetchOrgDataInBrowser };
