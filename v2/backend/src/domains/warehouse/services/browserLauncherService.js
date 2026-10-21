const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");

const activeContexts = new Map();
const launchingContexts = new Map();

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

/**
 * Giữ tương thích với module gọi cũ. Playwright tự quản lý Chromium khi
 * WAREHOUSE_BROWSER_EXECUTABLE_PATH không được cấu hình.
 */
const findBrowserExecutable = () => process.env.WAREHOUSE_BROWSER_EXECUTABLE_PATH || null;

/**
 * Phân giải URL đăng nhập với fallback nhận biết tự động.
 */
const resolveLoginUrl = (serviceName = "", customUrl = null) => {
  if (customUrl && typeof customUrl === "string" && customUrl.trim().startsWith("http")) {
    return customUrl.trim();
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

const getOrLaunchContext = async (accountId, profileDir) => {
  const key = String(accountId);
  const existing = activeContexts.get(key);
  if (existing) return { context: existing, created: false };

  const launching = launchingContexts.get(key);
  if (launching) return { context: await launching, created: false };

  const { headless, executablePath, timeout } = getLaunchConfig();
  const contextPromise = chromium
    .launchPersistentContext(profileDir, {
      headless,
      executablePath,
      timeout,
      args: ["--no-first-run", "--no-default-browser-check"],
    })
    .then((context) => {
      activeContexts.set(key, context);
      context.once("close", () => activeContexts.delete(key));
      return context;
    });

  launchingContexts.set(key, contextPromise);
  try {
    return { context: await contextPromise, created: true };
  } finally {
    launchingContexts.delete(key);
  }
};

/**
 * Khởi chạy Chromium Playwright với profile độc lập cho từng tài khoản.
 */
const launchAccountBrowser = async ({ accountId, accountUsername, serviceName, customUrl }) => {
  if (!accountId) throw new Error("ID tài khoản không được để trống!");

  const targetUrl = resolveLoginUrl(serviceName, customUrl);
  const baseProfileDir = path.resolve(process.cwd(), "browser_profiles");
  const accountProfileDir = path.join(baseProfileDir, `account_${accountId}`);
  fs.mkdirSync(accountProfileDir, { recursive: true });

  const { context, created } = await getOrLaunchContext(accountId, accountProfileDir);
  const page = context.pages()[0] || await context.newPage();
  const { timeout, executablePath } = getLaunchConfig();
  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout });
  } catch (error) {
    if (created) await context.close();
    throw error;
  }
  await page.bringToFront();

  const payload = {
    accountId,
    accountUsername: accountUsername || `Account_${accountId}`,
    serviceName: serviceName || "General",
    targetUrl,
    profileDir: accountProfileDir,
    browserExecutable: executablePath ? path.basename(executablePath) : "playwright-chromium",
    openedAt: new Date().toISOString(),
  };

  eventBus.emit(EVENTS.WAREHOUSE_ACCOUNT_BROWSER_OPENED, payload);

  return {
    success: true,
    message: `Đã mở Chromium Playwright (Profile riêng: account_${accountId}) cho tài khoản ${accountUsername || accountId}!`,
    data: payload,
  };
};

module.exports = {
  findBrowserExecutable,
  resolveLoginUrl,
  launchAccountBrowser,
};
