const logger = require("../../../../utils/logger");
const { withRecoverableRetry } = require("./retry");

const ADMIN_PRODUCTS = "https://adminconsole.adobe.com/products";

function extractOrgIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/\/([A-Fa-f0-9]{20,})@AdobeOrg/);
  return m ? m[1] : null;
}

async function waitForProductsPageReady(page, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (!url.includes("adminconsole.adobe.com") || !url.includes("/products")) {
      await page.waitForTimeout(1500);
      continue;
    }
    const ready = await page
      .locator(
        [
          '[data-testid="table"]',
          '[data-testid="product-name"]',
          '[data-testid="product-name-cell"]',
          '[role="grid"]',
          '[role="table"]',
          '[role="rowgroup"] [role="row"]',
          "table tbody tr",
          'button:has-text("Xuất sang CSV")',
          'button:has-text("Export")',
        ].join(", ")
      )
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (ready) {
      await page.waitForTimeout(1500);
      logger.info("[adobe-v2] B12: Trang products đã load xong");
      return;
    }
    await page.waitForTimeout(1500);
  }
  logger.warn("[adobe-v2] B12: Timeout chờ trang products (vẫn scrape thử)");
}

function scrapeProductsPage(page) {
  return page
    .evaluate(() => {
      const out = [];
      const parseUsage = (text) => {
        const t = (text || "").replace(/\s+/g, " ").trim();
        const m = t.match(/(\d+)\s*(?:trên|of|\/)\s*(\d+)/i) || t.match(/(\d+)\s*\/\s*(\d+)/);
        if (!m) return { used: 0, total: 0 };
        return { used: parseInt(m[1], 10) || 0, total: parseInt(m[2], 10) || 0 };
      };

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

      const gridRows = Array.from(
        document.querySelectorAll('[role="rowgroup"] [role="row"], [role="grid"] [role="row"], [role="table"] [role="row"]')
      ).filter((r) => r && r.textContent && r.textContent.trim().length > 0);
      for (const row of gridRows) {
        const txt = (row.textContent || "").replace(/\s+/g, " ").trim();
        if (/^\s*(tên|name)\b/i.test(txt) && /(số lượng|quantity|thẻ|status)/i.test(txt)) continue;
        const usageMatch = txt.match(/(\d+)\s*(?:trên|of|\/)\s*(\d+)/i) || txt.match(/(\d+)\s*\/\s*(\d+)/);
        const { used, total } = parseUsage(usageMatch ? usageMatch[0] : "");
        if (!usageMatch) continue;
        const idx = txt.toLowerCase().indexOf(usageMatch[0].toLowerCase());
        const name = (idx > 0 ? txt.slice(0, idx) : txt).trim();
        if (name) out.push({ name, used, total, unit: "" });
      }
      return out;
    })
    .catch(() => []);
}

async function runCheckProductFlow(page) {
  return withRecoverableRetry(
    "B12-check-product",
    async () => {
      logger.info("[adobe-v2] B12: adminconsole/products");
      await page.goto(ADMIN_PRODUCTS, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
      await waitForProductsPageReady(page, 20000);

      const productsUrl = page.url();
      if (!productsUrl.includes("adminconsole.adobe.com") || !productsUrl.includes("/products")) {
        logger.warn("[adobe-v2] B12: URL đã đổi sau khi load (redirect?), url=%s", productsUrl.slice(0, 100));
      }

      const orgId = extractOrgIdFromUrl(productsUrl);
      const products = await scrapeProductsPage(page);

      const onProductsPage =
        productsUrl.includes("adminconsole.adobe.com") && productsUrl.includes("/products");
      const license_status =
        products.length === 0
          ? onProductsPage
            ? "Expired"
            : "unknown"
          : products.some((p) => (p.total || 0) > 0)
            ? "Paid"
            : "Expired";

      logger.info(
        "[adobe-v2] products: %d, license_status: %s, orgId: %s, onProductsPage: %s",
        products.length,
        license_status,
        orgId || "(null)",
        onProductsPage
      );

      return { orgId, products, license_status };
    },
    { retries: 1, waitMs: 1200 }
  );
}

module.exports = {
  runCheckProductFlow,
  extractOrgIdFromUrl,
};
