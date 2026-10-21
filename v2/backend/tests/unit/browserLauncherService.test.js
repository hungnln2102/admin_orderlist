const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
require("module-alias/register");

const {
  detectBrowserChannelFromUserAgent,
  getAccountProfileDir,
  getBrowserWindowArgs,
  getChannelCandidates,
  getProfileBaseDir,
  getSessionProbeUrl,
  hasSessionCookieForUrl,
  isLoginFlowUrl,
  isAllowedLoginUrl,
  isVerifiedSessionUrl,
  resolveBrowserChannel,
  resolveLoginUrl,
} = require("@/domains/warehouse/services/browserLauncherService");

const EDGE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0";
const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const FIREFOX_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0";

test("nhận diện trình duyệt người dùng từ User-Agent, mặc định là Edge", () => {
  assert.equal(detectBrowserChannelFromUserAgent(EDGE_UA), "msedge");
  assert.equal(detectBrowserChannelFromUserAgent(CHROME_UA), "chrome");
  assert.equal(detectBrowserChannelFromUserAgent(FIREFOX_UA), "msedge");
  assert.equal(detectBrowserChannelFromUserAgent(""), "msedge");
});

test("WAREHOUSE_BROWSER_CHANNEL ghi đè nhận diện tự động", () => {
  const originalValue = process.env.WAREHOUSE_BROWSER_CHANNEL;
  process.env.WAREHOUSE_BROWSER_CHANNEL = "chrome";
  try {
    assert.equal(resolveBrowserChannel(EDGE_UA), "chrome");
    process.env.WAREHOUSE_BROWSER_CHANNEL = "invalid";
    assert.equal(resolveBrowserChannel(EDGE_UA), "msedge");
  } finally {
    if (originalValue === undefined) delete process.env.WAREHOUSE_BROWSER_CHANNEL;
    else process.env.WAREHOUSE_BROWSER_CHANNEL = originalValue;
  }
});

test("thử trình duyệt ưu tiên trước rồi mới tới trình duyệt dự phòng", () => {
  assert.deepEqual(getChannelCandidates("chrome"), ["chrome", "msedge", "chromium"]);
  assert.deepEqual(getChannelCandidates("msedge"), ["msedge", "chrome", "chromium"]);
});

test("chỉ chấp nhận URL https thuộc allowlist trình duyệt kho", () => {
  assert.equal(isAllowedLoginUrl("https://accounts.google.com/signin"), true);
  assert.equal(isAllowedLoginUrl("http://accounts.google.com/signin"), false);
  assert.equal(isAllowedLoginUrl("https://127.0.0.1:3000"), false);
  assert.equal(isAllowedLoginUrl("https://example.com"), false);
});

test("chỉ xác nhận đăng nhập khi profile có session cookie hợp lệ của đúng hostname", () => {
  const originalNames = process.env.WAREHOUSE_BROWSER_SESSION_COOKIE_NAMES;
  process.env.WAREHOUSE_BROWSER_SESSION_COOKIE_NAMES = "idg_token";
  const cookies = [
    { name: "_ga", value: "analytics", domain: ".account.adobe.com", expires: -1 },
    { name: "idg_token", value: "active", domain: "idg.adobe.com", expires: -1 },
    { name: "idg_token", value: "", domain: "idg.adobe.com", expires: -1 },
  ];

  try {
    assert.equal(hasSessionCookieForUrl(cookies, "https://account.adobe.com", 100), true);
    assert.equal(hasSessionCookieForUrl([{ ...cookies[0] }], "https://account.adobe.com", 100), false);
    assert.equal(hasSessionCookieForUrl([{ ...cookies[2] }], "https://account.adobe.com", 100), false);
  } finally {
    if (originalNames === undefined) delete process.env.WAREHOUSE_BROWSER_SESSION_COOKIE_NAMES;
    else process.env.WAREHOUSE_BROWSER_SESSION_COOKIE_NAMES = originalNames;
  }
});

test("không coi URL flow đăng nhập là phiên đã xác thực", () => {
  assert.equal(isLoginFlowUrl("https://auth.services.adobe.com/en_US/deeplink.html"), true);
  assert.equal(isLoginFlowUrl("https://accounts.google.com/signin/v2/identifier"), true);
  assert.equal(isLoginFlowUrl("https://account.adobe.com/profile"), false);
});

test("Adobe chỉ được xác minh khi session probe vẫn ở trang profile", () => {
  const probeUrl = getSessionProbeUrl("https://account.adobe.com");
  assert.equal(probeUrl, "https://account.adobe.com/profile");
  assert.equal(isVerifiedSessionUrl("https://auth.services.adobe.com/en_US/deeplink.html", probeUrl), false);
  assert.equal(isVerifiedSessionUrl("https://account.adobe.com/", probeUrl), false);
  assert.equal(isVerifiedSessionUrl("https://account.adobe.com/profile", probeUrl), true);
});

test("custom URL ngoài allowlist bị chặn", () => {
  assert.throws(
    () => resolveLoginUrl("Netflix", "http://127.0.0.1:3000"),
    /WAREHOUSE_BROWSER_ALLOWED_HOSTS/
  );
});

test("cho phép domain cấu hình bổ sung", () => {
  const originalValue = process.env.WAREHOUSE_BROWSER_ALLOWED_HOSTS;
  process.env.WAREHOUSE_BROWSER_ALLOWED_HOSTS = "login.example-service.com";

  try {
    assert.equal(
      resolveLoginUrl("Dịch vụ tùy chỉnh", "https://login.example-service.com/auth"),
      "https://login.example-service.com/auth"
    );
  } finally {
    if (originalValue === undefined) delete process.env.WAREHOUSE_BROWSER_ALLOWED_HOSTS;
    else process.env.WAREHOUSE_BROWSER_ALLOWED_HOSTS = originalValue;
  }
});

test("profile browser nằm ngoài thư mục backend được nodemon theo dõi", () => {
  const originalValue = process.env.WAREHOUSE_BROWSER_PROFILE_DIR;
  const profileRoot = fs.mkdtempSync(path.join(os.tmpdir(), "admin-orderlist-browser-profile-"));
  process.env.WAREHOUSE_BROWSER_PROFILE_DIR = profileRoot;

  try {
    const accountProfileDir = getAccountProfileDir("chromium", 987654);
    assert.equal(getProfileBaseDir(), path.resolve(profileRoot));
    assert.equal(accountProfileDir, path.join(path.resolve(profileRoot), "chromium", "account_987654"));
    assert.equal(accountProfileDir.startsWith(process.cwd()), false);
  } finally {
    fs.rmSync(profileRoot, { recursive: true, force: true });
    if (originalValue === undefined) delete process.env.WAREHOUSE_BROWSER_PROFILE_DIR;
    else process.env.WAREHOUSE_BROWSER_PROFILE_DIR = originalValue;
  }
});

test("browser kho mở cửa sổ nhỏ theo kích thước cấu hình", () => {
  const originalWidth = process.env.WAREHOUSE_BROWSER_WINDOW_WIDTH;
  const originalHeight = process.env.WAREHOUSE_BROWSER_WINDOW_HEIGHT;
  process.env.WAREHOUSE_BROWSER_WINDOW_WIDTH = "820";
  process.env.WAREHOUSE_BROWSER_WINDOW_HEIGHT = "600";

  try {
    assert.deepEqual(getBrowserWindowArgs(), [
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=820,600",
    ]);
  } finally {
    if (originalWidth === undefined) delete process.env.WAREHOUSE_BROWSER_WINDOW_WIDTH;
    else process.env.WAREHOUSE_BROWSER_WINDOW_WIDTH = originalWidth;
    if (originalHeight === undefined) delete process.env.WAREHOUSE_BROWSER_WINDOW_HEIGHT;
    else process.env.WAREHOUSE_BROWSER_WINDOW_HEIGHT = originalHeight;
  }
});
