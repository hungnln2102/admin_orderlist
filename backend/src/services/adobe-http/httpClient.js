/**
 * HTTP client wrapper: axios instance với cookie jar (tough-cookie).
 * Mỗi session login tạo 1 client mới (cookie jar riêng).
 */

const axios = require("axios");
const tough = require("tough-cookie");
const { DEFAULT_HEADERS } = require("./constants");

/**
 * Tạo axios instance có cookie jar tự động.
 * @returns {{ client: import('axios').AxiosInstance, jar: import('tough-cookie').CookieJar }}
 */
function createHttpClient() {
  const jar = new tough.CookieJar();

  const client = axios.create({
    headers: { ...DEFAULT_HEADERS },
    timeout: 60000,
    maxRedirects: 10,
    validateStatus: () => true,
  });

  client.interceptors.request.use(async (config) => {
    const url = config.url || "";
    try {
      const cookieString = await jar.getCookieString(url);
      if (cookieString) {
        config.headers = config.headers || {};
        config.headers.Cookie = cookieString;
      }
    } catch (_) {}
    return config;
  });

  client.interceptors.response.use(async (response) => {
    const url = response.config.url || "";
    const setCookies = response.headers["set-cookie"];
    if (setCookies) {
      const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
      for (const raw of arr) {
        try {
          await jar.setCookie(raw, url);
        } catch (_) {}
      }
    }
    return response;
  });

  return { client, jar };
}

/**
 * Lưu cookies từ jar theo format tương thích Puppeteer/DB.
 * @param {import('tough-cookie').CookieJar} jar
 * @returns {{ cookies: Array, savedAt: string }}
 */
function exportCookies(jar) {
  const store = jar.serializeSync();
  const cookies = (store.cookies || []).map((c) => ({
    name: c.key,
    value: c.value || "",
    domain: c.domain,
    path: c.path || "/",
    httpOnly: !!c.httpOnly,
    secure: c.secure !== false,
    sameSite: c.sameSite || "Lax",
    expirationDate: c.expires ? Math.floor(new Date(c.expires).getTime() / 1000) : undefined,
    session: !c.expires || c.expires === "Infinity",
  }));
  return { cookies, savedAt: new Date().toISOString() };
}

/**
 * Import cookies (format Puppeteer/DB) vào jar.
 * @param {import('tough-cookie').CookieJar} jar
 * @param {Array<{ name, value, domain, path?, httpOnly?, secure?, sameSite?, expirationDate? }>} cookies
 */
async function importCookies(jar, cookies) {
  for (const c of cookies) {
    if (!c.name || !c.domain) continue;
    const domain = c.domain.startsWith(".") ? c.domain : `.${c.domain}`;
    const url = `https://${domain.replace(/^\./, "")}${c.path || "/"}`;
    const cookieStr = [
      `${c.name}=${c.value || ""}`,
      `Domain=${domain}`,
      `Path=${c.path || "/"}`,
      c.httpOnly ? "HttpOnly" : "",
      c.secure !== false ? "Secure" : "",
      c.expirationDate ? `Expires=${new Date(c.expirationDate * 1000).toUTCString()}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    try {
      await jar.setCookie(cookieStr, url);
    } catch (_) {}
  }
}

module.exports = { createHttpClient, exportCookies, importCookies };
