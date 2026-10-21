const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");

const activeContexts = new Map();
const launchingContexts = new Map();
const DEFAULT_ALLOWED_LOGIN_HOSTS = new Set([
  "accounts.google.com",
  "www.netflix.com",
  "account.adobe.com",
  "www.canva.com",
  "gemini.google.com",
  "accounts.spotify.com",
  "login.microsoftonline.com",
  "chatgpt.com",
  "www.google.com",
]);

const parseBoolean = (raw, fallback) => {
  if (raw == null || String(raw).trim() === "") return fallback;
  return !["false", "0", "no", "off"].includes(String(raw).trim().toLowerCase());
};

const getLaunchConfig = () => {
  const rawTimeout = Number.parseInt(process.env.WAREHOUSE_BROWSER_TIMEOUT_MS || "", 10);

  return {
    headless: parseBoolean(process.env.WAREHOUSE_BROWSER_HEADLESS, false),
    executablePath: process.env.WAREHOUSE_BROWSER_EXECUTABLE_PATH || undefined,
    timeout: Number.isFinite(rawTimeout) && rawTimeout >= 5_000 ? rawTimeout : 30_000,
  };
};

const getBrowserWindowArgs = () => {
  const width = Number.parseInt(process.env.WAREHOUSE_BROWSER_WINDOW_WIDTH || "", 10);
  const height = Number.parseInt(process.env.WAREHOUSE_BROWSER_WINDOW_HEIGHT || "", 10);
  const safeWidth = Number.isFinite(width) && width >= 480 ? width : 760;
  const safeHeight = Number.isFinite(height) && height >= 400 ? height : 640;

  return ["--no-first-run", "--no-default-browser-check", `--window-size=${safeWidth},${safeHeight}`];
};

/**
 * Giữ tương thích với module gọi cũ. Playwright tự quản lý Chromium khi
 * WAREHOUSE_BROWSER_EXECUTABLE_PATH không được cấu hình.
 */
const findBrowserExecutable = () => process.env.WAREHOUSE_BROWSER_EXECUTABLE_PATH || null;

const getAllowedLoginHosts = () => {
  const configuredHosts = (process.env.WAREHOUSE_BROWSER_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_LOGIN_HOSTS, ...configuredHosts]);
};

const isAllowedLoginUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && getAllowedLoginHosts().has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};

/**
 * Phân giải URL đăng nhập với fallback nhận biết tự động.
 */
const resolveLoginUrl = (serviceName = "", customUrl = null) => {
  if (customUrl && typeof customUrl === "string" && customUrl.trim()) {
    const trimmedUrl = customUrl.trim();
    if (!isAllowedLoginUrl(trimmedUrl)) {
      throw new Error("URL đăng nhập không hợp lệ hoặc chưa nằm trong WAREHOUSE_BROWSER_ALLOWED_HOSTS.");
    }
    return trimmedUrl;
  }

  const normalized = (serviceName || "").toLowerCase();
  if (normalized.includes("youtube") || normalized.includes("google") || normalized.includes("mail")) {
    return "https://accounts.google.com";
  }
  if (normalized.includes("netflix")) return "https://www.netflix.com/login";
  if (normalized.includes("adobe")) return "https://account.adobe.com";
  if (normalized.includes("canva")) return "https://www.canva.com/login";
  if (normalized.includes("gemini")) return "https://gemini.google.com";
  if (normalized.includes("spotify")) return "https://accounts.spotify.com/login";
  if (normalized.includes("microsoft") || normalized.includes("office")) {
    return "https://login.microsoftonline.com";
  }
  if (normalized.includes("chatgpt") || normalized.includes("openai")) return "https://chatgpt.com/auth/login";

  return "https://www.google.com";
};

const BROWSER_CHANNELS = {
  msedge: { label: "Microsoft Edge", channel: "msedge" },
  chrome: { label: "Google Chrome", channel: "chrome" },
  chromium: { label: "Chromium (Playwright)", channel: undefined },
};
const DEFAULT_BROWSER_CHANNEL = "msedge";

const detectBrowserChannelFromUserAgent = (userAgent = "") => {
  const ua = String(userAgent || "");
  if (/\bEdg(e|A|iOS)?\//.test(ua)) return "msedge";
  if (/\b(OPR|Opera|Brave|Vivaldi|YaBrowser|CocCoc|coc_coc_browser)\b/i.test(ua)) return DEFAULT_BROWSER_CHANNEL;
  if (/\b(Chrome|CriOS)\//.test(ua)) return "chrome";
  return DEFAULT_BROWSER_CHANNEL;
};

const resolveBrowserChannel = (userAgent) => {
  const configured = String(process.env.WAREHOUSE_BROWSER_CHANNEL || "").trim().toLowerCase();
  if (BROWSER_CHANNELS[configured]) return configured;
  return detectBrowserChannelFromUserAgent(userAgent);
};

const getChannelCandidates = (preferredChannel) => {
  const fallbacks = ["msedge", "chrome", "chromium"];
  return [preferredChannel, ...fallbacks.filter((channel) => channel !== preferredChannel)];
};

const isBrowserNotInstalledError = (error) =>
  /distribution '.+' is not found|is not installed|Executable doesn't exist/i.test(String(error?.message || ""));

const getProfileBaseDir = () => path.resolve(
  process.env.WAREHOUSE_BROWSER_PROFILE_DIR
    || path.join(os.homedir(), ".admin_orderlist", "warehouse_browser_profiles")
);

const getAccountProfileDir = (channelKey, accountId) => {
  const baseProfileDir = getProfileBaseDir();
  const accountProfileDir = path.join(baseProfileDir, channelKey, `account_${accountId}`);

  const legacyProfileDir = path.resolve(
    process.cwd(),
    "browser_profiles",
    channelKey,
    `account_${accountId}`
  );
  if (!fs.existsSync(accountProfileDir) && fs.existsSync(legacyProfileDir)) {
    fs.cpSync(legacyProfileDir, accountProfileDir, { recursive: true });
    console.log(`[BrowserLauncher] Đã chuyển profile cũ của account_${accountId} ra ngoài thư mục backend.`);
  }

  fs.mkdirSync(accountProfileDir, { recursive: true });
  return accountProfileDir;
};

const getConfiguredSessionCookieNames = () => new Set(
  String(process.env.WAREHOUSE_BROWSER_SESSION_COOKIE_NAMES || "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
);

const cookieMatchesHostname = (cookieDomain, hostname) => {
  const normalizedDomain = String(cookieDomain || "").replace(/^\./, "").toLowerCase();
  const normalizedHostname = String(hostname || "").toLowerCase();
  return normalizedHostname === normalizedDomain || normalizedHostname.endsWith(`.${normalizedDomain}`);
};

const hasSessionCookieForUrl = (cookies, targetUrl, nowSeconds = Date.now() / 1000) => {
  const configuredNames = getConfiguredSessionCookieNames();
  if (configuredNames.size === 0) return false;

  return (cookies || []).some((cookie) => {
    const name = String(cookie?.name || "").toLowerCase();
    const value = String(cookie?.value || "").trim();
    const isUnexpired = Number(cookie?.expires) < 0 || Number(cookie?.expires) > nowSeconds;

    return isUnexpired && value.length > 0 && configuredNames.has(name);
  });
};

const hasVisibleLoginForm = async (page, waitMs = 3_000) => {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const visible = await page.evaluate(() => {
      const selectors = [
        'input[name="username"]',
        'input[type="email"]',
        'input[name="email"]',
        'input[type="password"]',
        'input#password',
      ];
      return selectors.some((selector) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && element.getBoundingClientRect().width > 0;
      });
    }).catch(() => true);
    if (visible) return true;
    await page.waitForTimeout(250);
  }
  return false;
};

const isLoginFlowUrl = (value) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    return (
      hostname.startsWith("auth.")
      || hostname.startsWith("login.")
      || /(?:^|\/)(login|signin|sign-in|deeplink)(?:\/|\.|$)/.test(pathname)
    );
  } catch {
    return true;
  }
};

const getSessionProbeUrl = (targetUrl) => {
  const url = new URL(targetUrl);
  if (url.hostname.toLowerCase() === "account.adobe.com") return "https://account.adobe.com/profile";
  return targetUrl;
};

const isVerifiedSessionUrl = (currentUrl, sessionProbeUrl) => {
  try {
    const current = new URL(currentUrl);
    const probe = new URL(sessionProbeUrl);
    if (isLoginFlowUrl(current.href) || current.hostname !== probe.hostname) return false;
    if (probe.hostname === "account.adobe.com") return current.pathname.startsWith("/profile");
    return true;
  } catch {
    return false;
  }
};

const launchContextForChannel = (accountId, channelKey) => {
  const key = `${channelKey}:${accountId}`;
  const existing = activeContexts.get(key);
  if (existing) return Promise.resolve({ context: existing, created: false, channelKey });

  const launching = launchingContexts.get(key);
  if (launching) return launching.then((context) => ({ context, created: false, channelKey }));

  const { headless, executablePath, timeout } = getLaunchConfig();
  const profileDir = getAccountProfileDir(channelKey, accountId);
  const contextPromise = chromium
    .launchPersistentContext(profileDir, {
      headless,
      channel: BROWSER_CHANNELS[channelKey].channel,
      timeout,
      viewport: null,
      args: getBrowserWindowArgs(),
    })
    .then((context) => {
      activeContexts.set(key, context);
      context.once("close", () => activeContexts.delete(key));
      return context;
    });

  launchingContexts.set(key, contextPromise);
  return contextPromise
    .then((context) => ({ context, created: true, channelKey }))
    .finally(() => launchingContexts.delete(key));
};

const launchContextWithExecutable = async (accountId, executablePath) => {
  const key = `custom:${accountId}`;
  const existing = activeContexts.get(key);
  if (existing) return { context: existing, created: false, channelKey: "custom" };

  const { headless, timeout } = getLaunchConfig();
  const context = await chromium.launchPersistentContext(getAccountProfileDir("custom", accountId), {
    headless,
    executablePath,
    timeout,
    viewport: null,
    args: getBrowserWindowArgs(),
  });
  activeContexts.set(key, context);
  context.once("close", () => activeContexts.delete(key));
  return { context, created: true, channelKey: "custom" };
};

const getOrLaunchContext = async (accountId, preferredChannel) => {
  const { executablePath } = getLaunchConfig();
  if (executablePath) return launchContextWithExecutable(accountId, executablePath);

  let lastError = null;
  for (const channelKey of getChannelCandidates(preferredChannel)) {
    try {
      return await launchContextForChannel(accountId, channelKey);
    } catch (error) {
      lastError = error;
      if (!isBrowserNotInstalledError(error)) throw error;
      console.warn(`[BrowserLauncher] Không mở được ${BROWSER_CHANNELS[channelKey].label}, thử trình duyệt khác: ${error.message.split("\n")[0]}`);
    }
  }

  throw new Error(`Không tìm thấy trình duyệt khả dụng (Edge/Chrome/Chromium). ${lastError?.message?.split("\n")[0] || ""}`.trim());
};

/**
 * Mở trình duyệt thật (ưu tiên Edge hoặc trình duyệt người dùng đang dùng) với profile lưu cookie riêng cho từng tài khoản.
 */
const launchAccountBrowser = async ({ accountId, accountUsername, serviceName, customUrl, userAgent }) => {
  if (!accountId) throw new Error("ID tài khoản không được để trống!");

  const targetUrl = resolveLoginUrl(serviceName, customUrl);
  const preferredChannel = resolveBrowserChannel(userAgent);

  const { context, created, channelKey } = await getOrLaunchContext(accountId, preferredChannel);
  const accountProfileDir = getAccountProfileDir(channelKey, accountId);
  const browserLabel = BROWSER_CHANNELS[channelKey]?.label || "Chromium (tùy chỉnh)";
  const page = context.pages()[0] || await context.newPage();
  const { timeout, executablePath } = getLaunchConfig();
  const sessionProbeUrl = getSessionProbeUrl(targetUrl);
  let navigationError = null;
  try {
    await page.goto(sessionProbeUrl, { waitUntil: "domcontentloaded", timeout });
    await Promise.race([
      page.waitForURL(
        (url) => isLoginFlowUrl(url.href) || isVerifiedSessionUrl(url.href, sessionProbeUrl),
        { timeout: 3_000 }
      ).catch(() => null),
      page.waitForTimeout(3_000),
    ]);
  } catch (error) {
    navigationError = error;
    console.warn(`[BrowserLauncher] Đã mở browser nhưng không thể tự điều hướng đến ${targetUrl}: ${error.message}`);
  }
  await page.bringToFront();
  const currentUrl = page.url();
  const hasSessionCookie = hasSessionCookieForUrl(await context.cookies(), targetUrl);
  const loginFormVisible = await hasVisibleLoginForm(page);
  const hasAuthenticatedSession = hasSessionCookie && !loginFormVisible && isVerifiedSessionUrl(currentUrl, sessionProbeUrl);

  const payload = {
    accountId,
    accountUsername: accountUsername || `Account_${accountId}`,
    serviceName: serviceName || "General",
    targetUrl,
    sessionProbeUrl,
    profileDir: accountProfileDir,
    browserChannel: channelKey,
    browserExecutable: executablePath ? path.basename(executablePath) : browserLabel,
    openedAt: new Date().toISOString(),
    navigationError: navigationError ? navigationError.message : null,
    hasSessionCookie,
    loginFormVisible,
    hasAuthenticatedSession,
    currentUrl,
  };

  eventBus.emit(EVENTS.WAREHOUSE_ACCOUNT_BROWSER_OPENED, payload);

  return {
    success: true,
    message: navigationError
      ? `Đã mở ${browserLabel} cho tài khoản ${accountUsername || accountId}, nhưng không thể tự điều hướng đến trang đăng nhập. Bạn có thể nhập URL trong cửa sổ vừa mở; cookie vẫn được lưu trong profile riêng.`
      : hasAuthenticatedSession
        ? `Đã xác minh phiên đăng nhập trong profile riêng của ${accountUsername || accountId}.`
        : `Đã mở ${browserLabel} (Profile riêng: account_${accountId}) cho tài khoản ${accountUsername || accountId}. Hãy đăng nhập trong cửa sổ này, sau đó bấm lại để xác minh phiên.`,
    data: payload,
  };
};

module.exports = {
  detectBrowserChannelFromUserAgent,
  findBrowserExecutable,
  getBrowserWindowArgs,
  getAllowedLoginHosts,
  getChannelCandidates,
  getAccountProfileDir,
  getProfileBaseDir,
  resolveBrowserChannel,
  isAllowedLoginUrl,
  hasSessionCookieForUrl,
  hasVisibleLoginForm,
  getSessionProbeUrl,
  isLoginFlowUrl,
  isVerifiedSessionUrl,
  resolveLoginUrl,
  launchAccountBrowser,
};
