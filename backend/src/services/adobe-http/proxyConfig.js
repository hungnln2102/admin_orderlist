/**
 * Cấu hình proxy cho Adobe HTTP + Playwright (đổi IP khi bị Adobe block sau 5 lần đăng nhập sai).
 *
 * Biến môi trường (ưu tiên theo thứ tự):
 *   ADOBE_PROXY   — dùng riêng cho luồng Adobe (ví dụ: http://proxy.example.com:8080 hoặc http://user:pass@host:port)
 *   HTTPS_PROXY   — proxy HTTPS (nhiều tool dùng chung)
 *   HTTP_PROXY    — proxy HTTP
 *
 * Để tắt proxy: ADOBE_PROXY= (rỗng) hoặc ADOBE_PROXY=0
 */

/**
 * Parse URL proxy thành object cho axios và Playwright.
 * @param {string} url - Ví dụ: http://host:8080, http://user:pass@host:8080, socks5://host:1080
 * @returns {{ server: string, username?: string, password?: string, host: string, port: number, protocol: string } | null}
 */
function parseProxyUrl(url) {
  const s = (url || "").trim();
  if (!s || s === "0" || s === "false") return null;

  try {
    const u = new URL(s);
    const protocol = u.protocol.replace(":", "") || "http";
    const host = u.hostname;
    const port = u.port ? parseInt(u.port, 10) : (protocol === "https" ? 443 : 80);
    const server = `${protocol}://${host}${u.port ? `:${u.port}` : ""}`;

    const result = {
      server,
      host,
      port: Number.isFinite(port) ? port : 80,
      protocol,
    };
    if (u.username) result.username = decodeURIComponent(u.username);
    if (u.password) result.password = decodeURIComponent(u.password);
    return result;
  } catch (_) {
    return null;
  }
}

/**
 * Lấy cấu hình proxy từ env (ADOBE_PROXY > HTTPS_PROXY > HTTP_PROXY).
 * @returns {ReturnType<parseProxyUrl>}
 */
function getProxyConfig() {
  const url =
    process.env.ADOBE_PROXY ||
    process.env.ADOBE_HTTP_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    "";
  return parseProxyUrl(url);
}

/**
 * Trả về object proxy cho Playwright (chromium.launch hoặc browser.newContext).
 * @returns {{ server: string, username?: string, password?: string } | undefined}
 */
function getPlaywrightProxyOptions() {
  const p = getProxyConfig();
  if (!p) return undefined;
  const opt = { server: p.server };
  if (p.username) opt.username = p.username;
  if (p.password) opt.password = p.password;
  return opt;
}

/**
 * Trả về config proxy cho axios (create({ proxy: ... })).
 * @returns {{ host: string, port: number, protocol: string, auth?: { username: string, password: string } } | undefined}
 */
function getAxiosProxyConfig() {
  const p = getProxyConfig();
  if (!p) return undefined;
  const config = {
    host: p.host,
    port: p.port,
    protocol: p.protocol,
  };
  if (p.username || p.password) {
    config.auth = {
      username: p.username || "",
      password: p.password || "",
    };
  }
  return config;
}

module.exports = {
  getProxyConfig,
  getPlaywrightProxyOptions,
  getAxiosProxyConfig,
  parseProxyUrl,
};
