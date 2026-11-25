const http = require("node:http");
const https = require("node:https");
const { chromium } = require("playwright");
const { db } = require("@/db");
const { TABLES, COLS } = require("@/db/tables");
const { normalizeWarehouseLoginUrl } = require("./warehouseLoginUrl");

const CDP_TIMEOUT = 5_000;
const NAVIGATION_TIMEOUT = 15_000;
const CDP_HEADERS = { Host: "localhost" };
const { ACCOUNT_SLOTS: SLOT, PRODUCT_NAMES: CATALOG } = COLS;
let navigationQueue = Promise.resolve();

class CloudBrowserError extends Error {
  constructor(status, message, options) {
    super(message, options);
    this.status = status;
  }
}

function positiveId(value) {
  if (typeof value === "string" && /^\d+$/.test(value)) value = Number(value);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function resolveLoginUrl({ catalogId, accountId, slotId }) {
  let id;
  if (catalogId !== undefined && accountId === undefined && slotId === undefined) {
    id = positiveId(catalogId);
    if (!id) throw new CloudBrowserError(400, "ID danh mục không hợp lệ.");
  } else if (catalogId === undefined && positiveId(accountId) && positiveId(slotId)) {
    const slot = await db(TABLES.ACCOUNT_SLOTS)
      .where({ [SLOT.ID]: positiveId(slotId), [SLOT.ACCOUNT_ID]: positiveId(accountId) })
      .first(SLOT.NAME_ID);
    if (!slot) throw new CloudBrowserError(404, "Không tìm thấy slot thuộc tài khoản kho.");
    id = slot[SLOT.NAME_ID];
  } else {
    throw new CloudBrowserError(400, "Cần cung cấp ID danh mục hoặc cặp ID tài khoản và slot hợp lệ.");
  }

  const catalog = id && await db(TABLES.PRODUCT_NAMES).where(CATALOG.ID, id).first(CATALOG.LOGIN_URL);
  if (!catalog) throw new CloudBrowserError(404, "Không tìm thấy dịch vụ trong danh mục kho.");
  const loginUrl = catalog[CATALOG.LOGIN_URL]?.trim();
  if (!loginUrl) throw new CloudBrowserError(422, "Dịch vụ chưa có đường dẫn đăng nhập trong danh mục kho.");
  const url = normalizeWarehouseLoginUrl(loginUrl);
  if (!url) {
    throw new CloudBrowserError(422, "Đường dẫn đăng nhập phải là URL HTTP hoặc HTTPS hợp lệ.");
  }
  return url;
}

async function resolveDebuggerUrl(endpoint) {
  const url = new URL(endpoint);
  if (["ws:", "wss:"].includes(url.protocol)) return url.href;
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid CDP protocol");

  // Chromium requires a local hostname in the discovery request. Keep the
  // configured network address when opening the discovered WebSocket path.
  const client = url.protocol === "https:" ? https : http;
  const discovery = await new Promise((resolve, reject) => {
    const request = client.get(new URL("/json/version", url), {
      headers: CDP_HEADERS,
      signal: AbortSignal.timeout(CDP_TIMEOUT),
    }, async (response) => {
      try {
        if (response.statusCode !== 200) {
          response.resume();
          throw new Error(`CDP discovery returned HTTP ${response.statusCode}`);
        }
        let body = "";
        for await (const chunk of response.setEncoding("utf8")) {
          body += chunk;
          if (body.length > 16_384) throw new Error("CDP discovery response is too large");
        }
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
  const { pathname } = new URL(discovery.webSocketDebuggerUrl);
  if (!/^\/devtools\/browser\/[\w-]+$/.test(pathname)) throw new Error("Invalid CDP debugger path");
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}${pathname}`;
}

async function performNavigation(selection) {
  const loginUrl = await resolveLoginUrl(selection || {});
  const endpoint = process.env.WAREHOUSE_CLOUD_BROWSER_CDP_URL?.trim();
  if (!endpoint) throw new CloudBrowserError(503, "Chưa cấu hình kết nối trình duyệt đám mây.");
  let browser;
  try {
    try {
      const debuggerUrl = await resolveDebuggerUrl(endpoint);
      browser = await chromium.connectOverCDP(debuggerUrl, {
        headers: CDP_HEADERS,
        noDefaults: true,
        timeout: CDP_TIMEOUT,
      });
    } catch (cause) {
      throw new CloudBrowserError(502, "Không thể kết nối với trình duyệt đám mây.", { cause });
    }

    const context = browser.contexts()[0];
    if (!context) throw new CloudBrowserError(502, "Trình duyệt đám mây chưa có phiên hiển thị.");
    try {
      const page = context.pages()[0] || await context.newPage();
      await page.bringToFront();
      await page.goto(loginUrl, { waitUntil: "commit", timeout: NAVIGATION_TIMEOUT });
    } catch (cause) {
      const status = cause.name === "TimeoutError" ? 504 : 502;
      throw new CloudBrowserError(status, "Trình duyệt đám mây không mở được trang đăng nhập.", { cause });
    }
    return { success: true };
  } finally {
    // For a Playwright CDP attachment, close() disconnects the transport.
    await browser?.close();
  }
}

function navigateCloudBrowser(selection) {
  const navigate = () => performNavigation(selection);
  navigationQueue = navigationQueue.then(navigate, navigate);
  return navigationQueue;
}

module.exports = { navigateCloudBrowser, CloudBrowserError };
