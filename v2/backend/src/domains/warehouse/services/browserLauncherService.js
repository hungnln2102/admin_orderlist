const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");

/**
 * Tìm đường dẫn file thực thi Chrome hoặc Chromium / Edge trên máy Windows
 */
const findBrowserExecutable = () => {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Mặc định gọi "chrome" nếu có trong PATH hệ thống
  return "chrome";
};

/**
 * Phân giải URL đăng nhập với fallback nhận biết tự động
 */
const resolveLoginUrl = (serviceName = "", customUrl = null) => {
  if (customUrl && typeof customUrl === "string" && customUrl.trim().startsWith("http")) {
    return customUrl.trim();
  }

  const normalized = (serviceName || "").toLowerCase();
  if (normalized.includes("youtube") || normalized.includes("google") || normalized.includes("mail")) {
    return "https://accounts.google.com";
  }
  if (normalized.includes("netflix")) {
    return "https://www.netflix.com/login";
  }
  if (normalized.includes("adobe")) {
    return "https://account.adobe.com";
  }
  if (normalized.includes("canva")) {
    return "https://www.canva.com/login";
  }
  if (normalized.includes("gemini")) {
    return "https://gemini.google.com";
  }
  if (normalized.includes("spotify")) {
    return "https://accounts.spotify.com/login";
  }
  if (normalized.includes("microsoft") || normalized.includes("office")) {
    return "https://login.microsoftonline.com";
  }
  if (normalized.includes("chatgpt") || normalized.includes("openai")) {
    return "https://chatgpt.com/auth/login";
  }

  return "https://www.google.com";
};

/**
 * Khởi chạy trình duyệt với Profile độc lập cho từng tài khoản
 */
const launchAccountBrowser = async ({ accountId, accountUsername, serviceName, customUrl }) => {
  if (!accountId) {
    throw new Error("ID tài khoản không được để trống!");
  }

  const browserPath = findBrowserExecutable();
  const targetUrl = resolveLoginUrl(serviceName, customUrl);

  // Thư mục lưu profile riêng biệt cho từng tài khoản
  const baseProfileDir = path.resolve(process.cwd(), "browser_profiles");
  const accountProfileDir = path.join(baseProfileDir, `account_${accountId}`);

  if (!fs.existsSync(accountProfileDir)) {
    fs.mkdirSync(accountProfileDir, { recursive: true });
  }

  const args = [
    `--user-data-dir=${accountProfileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    targetUrl,
  ];

  const child = spawn(browserPath, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });

  child.unref();

  const payload = {
    accountId,
    accountUsername: accountUsername || `Account_${accountId}`,
    serviceName: serviceName || "General",
    targetUrl,
    profileDir: accountProfileDir,
    browserExecutable: path.basename(browserPath),
    openedAt: new Date().toISOString(),
  };

  eventBus.emit(EVENTS.WAREHOUSE_ACCOUNT_BROWSER_OPENED, payload);

  return {
    success: true,
    message: `Đã mở trình duyệt (Profile riêng: account_${accountId}) cho tài khoản ${accountUsername || accountId}!`,
    data: payload,
  };
};

module.exports = {
  findBrowserExecutable,
  resolveLoginUrl,
  launchAccountBrowser,
};
