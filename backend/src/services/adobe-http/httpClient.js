/**
 * HTTP client wrapper: axios instance với cookie jar (tough-cookie).
 * Mỗi session login tạo 1 client mới (cookie jar riêng).
 */

const axios = require("axios");
const tough = require("tough-cookie");
const { DEFAULT_HEADERS } = require("./constants");
const { getAxiosProxyConfig } = require("./proxyConfig");

/**
 * Tạo axios instance có cookie jar tự động.
 * Nếu có ADOBE_PROXY / HTTPS_PROXY / HTTP_PROXY thì request đi qua proxy (đổi IP, tránh bị Adobe block).
 * @returns {{ client: import('axios').AxiosInstance, jar: import('tough-cookie').CookieJar }}
 */
function createHttpClient() {
  const jar = new tough.CookieJar();

  const axiosConfig = {
    headers: { ...DEFAULT_HEADERS },
    timeout: 60000,
    maxRedirects: 10,
    validateStatus: () => true,
  };

  const proxy = getAxiosProxyConfig();
  if (proxy) {
    axiosConfig.proxy = proxy;
  }

  const client = axios.create(axiosConfig);

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
  const cookies = (store.cookies || []).map((c) => {
    const isSession = !c.expires || c.expires === "Infinity";
    let expirationDate;
    if (!isSession && c.expires) {
      const ms = new Date(c.expires).getTime();
      if (Number.isFinite(ms)) expirationDate = Math.floor(ms / 1000);
    }
    return {
      name: c.key,
      value: c.value || "",
      domain: c.domain || undefined,
      path: c.path || "/",
      httpOnly: !!c.httpOnly,
      secure: c.secure !== false,
      sameSite: c.sameSite || "Lax",
      expirationDate,
      session: isSession,
    };
  });
  return { cookies, savedAt: new Date().toISOString() };
}

/**
 * Import cookies (format Puppeteer/DB) vào jar.
 * @param {import('tough-cookie').CookieJar} jar
 * @param {Array<{ name, value, domain, path?, httpOnly?, secure?, sameSite?, expirationDate? }>} cookies
 */
function sameSiteHeaderValue(sameSite) {
  const v = (sameSite && String(sameSite).toLowerCase()) || "lax";
  if (v === "none") return "None";
  if (v === "strict") return "Strict";
  return "Lax";
}

async function importCookies(jar, cookies) {
  if (!Array.isArray(cookies)) return;
  for (const c of cookies) {
    if (!c.name || !c.domain) continue;
    const domain = c.domain.startsWith(".") ? c.domain : `.${c.domain}`;
    const path = c.path || "/";
    const url = `https://${domain.replace(/^\./, "")}${path}`;
    const parts = [
      `${c.name}=${c.value || ""}`,
      `Domain=${domain}`,
      `Path=${path}`,
      c.httpOnly !== false ? "HttpOnly" : "",
      c.secure !== false ? "Secure" : "",
      c.expirationDate ? `Expires=${new Date(c.expirationDate * 1000).toUTCString()}` : "",
      `SameSite=${sameSiteHeaderValue(c.sameSite)}`,
    ].filter(Boolean);
    const cookieStr = parts.join("; ");
    try {
      await jar.setCookie(cookieStr, url);
    } catch (_) {}
  }
}

module.exports = { createHttpClient, exportCookies, importCookies };
