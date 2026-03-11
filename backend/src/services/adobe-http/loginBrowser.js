/**
 * Login Adobe bằng Playwright headless Chromium.
 * Chỉ mở browser để login, sau đó đóng ngay.
 * Trả về cookies + access token cho HTTP client dùng tiếp.
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
const mailOtpService = require("../mailOtpService");

const ADOBE_LOGIN_URL =
  "https://auth.services.adobe.com/en_US/index.html?callback=https%3A%2F%2Fims-na1.adobelogin.com%2Fims%2Fadobeid%2Faac_manage_teams%2FAdobeID%2Ftoken%3Fredirect_uri%3Dhttps%253A%252F%252Fadminconsole.adobe.com%252F&client_id=aac_manage_teams&scope=AdobeID%2Copenid%2Cgnav%2Cread_organizations%2Cadditional_info.roles&denied_callback=https%3A%2F%2Fims-na1.adobelogin.com%2Fims%2Fdenied%2Faac_manage_teams%3Fredirect_uri%3Dhttps%253A%252F%252Fadminconsole.adobe.com%252F%26response_type%3Dtoken&locale=en_US&flow_type=token&idp_flow_type=login&response_type=token&relay=9e0af1a0-36dc-4ac4-8932-9f0eec3fbb00";

const PASSWORD_SELECTORS = [
  'input[name="password"]',
  'input[type="password"]',
  'input#password',
  'input[data-testid="password-field"]',
];

const SKIP_RE = /^\s*(not now|skip|bỏ qua|later|skip for now)\s*$/i;

/**
 * Login Adobe bằng Playwright, trả về cookies + access token.
 * Browser chỉ mở tạm (~15-30s) rồi đóng ngay.
 */
async function loginWithPlaywright(email, password, options = {}) {
  const { savedCookies = [], mailBackupId = null } = options;

  logger.info("[adobe-login] Khởi động Playwright Chromium headless...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  let accessToken = null;

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    page.on("framenavigated", async (frame) => {
      if (frame !== page.mainFrame()) return;
      try {
        const hash = await frame.evaluate(() => window.location.hash).catch(() => "");
        const m = hash.match(/access_token=([^&]+)/);
        if (m && !accessToken) {
          accessToken = decodeURIComponent(m[1]);
          logger.info("[adobe-login] Captured access_token từ redirect");
        }
      } catch (_) {}
    });

    // --- Cookie login (fast path) ---
    if (savedCookies.length > 0) {
      const pwCookies = toPwCookies(savedCookies);
      if (pwCookies.length > 0) {
        await context.addCookies(pwCookies);
        logger.info("[adobe-login] Import %d cookies, cookie-login...", pwCookies.length);

        await page.goto("https://adminconsole.adobe.com/", {
          waitUntil: "networkidle",
          timeout: 45000,
        }).catch(() => {});

        await page.waitForTimeout(3000);
        const url1 = page.url();

        if (url1.includes("auth.services") || url1.includes("adobelogin.com")) {
          logger.info("[adobe-login] Cookies hết hạn (redirect → login page)");
        } else {
          // Vẫn ở Admin Console → cookies hợp lệ, đợi SPA route xong
          try {
            await page.waitForFunction(
              () => window.location.href.includes("@AdobeOrg"),
              { timeout: 15000 }
            );
          } catch (_) {
            logger.info("[adobe-login] SPA chưa route tới @AdobeOrg, vẫn thử extract token...");
          }

          if (!accessToken) accessToken = await extractTokenFromPage(page);
          const finalUrl = page.url();
          logger.info("[adobe-login] Cookie-login OK — url=%s, hasToken=%s", finalUrl, !!accessToken);

          const cookies = await context.cookies();
          return { success: true, cookies: fromPwCookies(cookies), accessToken };
        }
      }
    }

    // --- Form login ---
    logger.info("[adobe-login] Form login: %s", email);
    await page.goto(ADOBE_LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 90000 }).catch((e) => {
      logger.warn("[adobe-login] Goto login timeout: %s", e.message);
    });

    // B1: Nhập email
    const emailInput = page.locator('input[name="username"], input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 45000 });
    await emailInput.click();
    await page.keyboard.type(email, { delay: 25 });
    await page.waitForTimeout(150);
    await page.keyboard.press("Enter");
    await Promise.race([
      page.waitForLoadState("domcontentloaded", { timeout: 30000 }),
      page.waitForTimeout(5000),
    ]).catch(() => {});
    await page.waitForTimeout(2000);

    // B2: 2FA sau email
    await handle2FA(page, mailBackupId);

    // B3: Nhập password
    const passwordInput = await waitForPasswordField(page);
    await passwordInput.click();
    await page.keyboard.type(password, { delay: 25 });
    await page.waitForTimeout(150);
    await page.keyboard.press("Enter");
    await page.waitForLoadState("networkidle", { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(5000);

    // B4: 2FA sau password
    await handle2FA(page, mailBackupId);

    // B5: Skip security prompt
    await maybeSkipSecurityPrompt(page);

    // B6: Progressive profile (backup email, verify phone, etc.)
    await handleProgressiveProfile(page, mailBackupId);

    // B7: Chờ login thành công
    logger.info("[adobe-login] Chờ redirect thành công (tối đa 90s)...");
    await page.waitForFunction(
      () => {
        const h = window.location.href;
        return (
          h.includes("@AdobeOrg") ||
          (/^https?:\/\/([a-z0-9-]+\.)*adobe\.com/i.test(h) && !h.includes("auth.services"))
        );
      },
      { timeout: 90000 }
    );
    await page.waitForTimeout(2500);

    // B8: Thử lấy token nếu chưa có
    if (!accessToken) accessToken = await extractTokenFromPage(page);

    // B9: Nếu chưa ở Admin Console, navigate tới đó để lấy thêm cookies
    const currentUrl = page.url();
    if (!currentUrl.includes("adminconsole.adobe.com")) {
      logger.info("[adobe-login] Navigate tới Admin Console để lấy cookies...");
      await page.goto("https://adminconsole.adobe.com/", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
      if (!accessToken) accessToken = await extractTokenFromPage(page);
    }

    const cookies = await context.cookies();
    logger.info("[adobe-login] Login thành công! URL: %s, hasToken: %s, cookies: %d",
      page.url().slice(0, 80), !!accessToken, cookies.length);

    return { success: true, cookies: fromPwCookies(cookies), accessToken };
  } catch (error) {
    logger.error("[adobe-login] Login thất bại: %s", error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
    logger.info("[adobe-login] Browser đã đóng");
  }
}

// ────────────────── Helpers ──────────────────

async function isOnVerifyScreen(page) {
  try {
    const url = page.url();
    if (/challenge\/verify\/email/i.test(url)) return true;
    return page.evaluate(() => (document.body?.innerText || "").includes("Verify your identity")).catch(() => false);
  } catch (_) {
    return false;
  }
}

async function handle2FA(page, mailBackupId) {
  if (!(await isOnVerifyScreen(page))) return;
  logger.info("[adobe-login] Gặp 2FA Verify screen, bấm Continue...");
  await page.waitForTimeout(2000);
  await tryClickContinue(page);
  await page.waitForTimeout(3000);
  await waitForOtpAndFill(page, mailBackupId);
}

async function tryClickContinue(page) {
  try {
    const btn = page.locator('[data-id="Page-PrimaryButton"]');
    if (await btn.isVisible({ timeout: 6000 })) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      return true;
    }
  } catch (_) {}

  const clicked = await page.evaluate(() => {
    const re = /\b(continue|tiếp\s*tục)\b/i;
    for (const el of document.querySelectorAll("button, [role='button'], a, input[type='submit']")) {
      const text = (el.textContent || el.getAttribute("aria-label") || "").trim();
      if (re.test(text)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 2 && rect.height > 2) { el.click(); return true; }
      }
    }
    return false;
  }).catch(() => false);
  return clicked;
}

async function waitForPasswordField(page) {
  for (const sel of PASSWORD_SELECTORS) {
    try {
      const loc = page.locator(sel).first();
      await loc.waitFor({ state: "visible", timeout: 8000 });
      return loc;
    } catch (_) {}
  }
  throw new Error("Không tìm thấy ô mật khẩu (có thể UI đổi hoặc cần 2FA).");
}

async function maybeSkipSecurityPrompt(page) {
  const url = page.url();
  if (!/progressive-profile\/user-security|user-security/i.test(url)) return;
  logger.info("[adobe-login] Gặp security prompt, bấm Skip...");
  await clickButtonByLabel(page, /^\s*skip\s*$/i, 15000);
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function handleProgressiveProfile(page, mailBackupId) {
  for (let round = 0; round < 6; round++) {
    const url = page.url();
    if (url.includes("@AdobeOrg") || (url.includes("adobe.com") && !url.includes("auth.services"))) return;

    // Add backup email screen
    const isBackup = await page.evaluate(() => {
      const t = document.body?.innerText || "";
      return /Add a backup email|Secondary email|Thêm địa chỉ email dự phòng/i.test(t);
    }).catch(() => false);
    if (isBackup) {
      logger.info("[adobe-login] Gặp Add backup email — bấm Not now");
      await clickButtonByLabel(page, SKIP_RE, 8000);
      await page.waitForTimeout(2000);
      continue;
    }

    // Verify screen
    if (await isOnVerifyScreen(page)) {
      await waitForOtpAndFill(page, mailBackupId);
      await page.waitForTimeout(3000);
      continue;
    }

    // Verify phone screen
    const isPhone = await page.evaluate(() => {
      const t = document.body?.innerText || "";
      const url = window.location.href;
      return (
        (/phone|số điện thoại|telephone|mobile/i.test(t) && /verify|add|thêm|xác minh/i.test(t)) ||
        /progressive-profile.*phone|add-phone|verify-phone/i.test(url)
      );
    }).catch(() => false);
    if (isPhone) {
      logger.info("[adobe-login] Gặp verify phone — bấm Not now/Skip");
      await clickButtonByLabel(page, SKIP_RE, 8000);
      await page.waitForTimeout(2500);
      continue;
    }

    break;
  }
}

async function clickButtonByLabel(page, re, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const clicked = await page.evaluate(
      (src, flags) => {
        const re = new RegExp(src, flags);
        for (const el of document.querySelectorAll("button, [role='button'], a, input[type='submit']")) {
          const text = (el.textContent || el.getAttribute("aria-label") || "").trim();
          if (re.test(text)) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 2 && rect.height > 2) { el.click(); return true; }
          }
        }
        return false;
      },
      re.source, re.flags
    ).catch(() => false);
    if (clicked) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

// ────────────────── OTP ──────────────────

async function fillOtpAndSubmit(page, code) {
  if (!code) return false;
  const codeStr = String(code).replace(/\D/g, "").slice(0, 8);

  // Nhiều ô (4-8 input)
  const countInputs = await page.evaluate(() => {
    const sels = [
      'input[autocomplete="one-time-code"]', 'input[inputmode="numeric"]',
      'input[maxlength="1"]', 'input[type="tel"]',
    ];
    for (const s of sels) {
      const list = document.querySelectorAll(s);
      if (list.length >= 4 && list.length <= 8) return list.length;
    }
    return 0;
  }).catch(() => 0);

  if (countInputs >= 4) {
    const digits = codeStr.slice(0, countInputs).split("");
    const inputs = await page.locator(
      'input[autocomplete="one-time-code"], input[inputmode="numeric"], input[maxlength="1"], input[type="tel"]'
    ).all();
    const slice = inputs.slice(0, countInputs);
    for (let i = 0; i < digits.length && i < slice.length; i++) {
      await slice[i].click();
      await page.waitForTimeout(80);
      await page.keyboard.type(digits[i], { delay: 50 });
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(500);
    await tryClickSubmit(page);
    return true;
  }

  // Ô đơn
  for (const sel of [
    'input[autocomplete="one-time-code"]', 'input[name*="code"]',
    'input[placeholder*="ode"]', 'input[type="text"][inputmode="numeric"]',
  ]) {
    const loc = page.locator(sel).first();
    if (await loc.isVisible().catch(() => false)) {
      await loc.click();
      await page.keyboard.type(codeStr, { delay: 80 });
      await page.waitForTimeout(300);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1000);
      await tryClickSubmit(page);
      return true;
    }
  }

  return false;
}

async function tryClickSubmit(page) {
  const btn = page.locator('[data-id="Page-PrimaryButton"], button[data-variant="accent"], button[type="submit"]').first();
  if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {});
}

async function waitForOtpAndFill(page, mailBackupId) {
  const envOtp = !!(
    process.env.ADOBE_OTP_IMAP_HOST &&
    (process.env.ADOBE_OTP_IMAP_USER || process.env.MAILTEST) &&
    (process.env.ADOBE_OTP_IMAP_PASSWORD || process.env.APPPASSWORD)
  );
  const otpAutoEnabled = !!(mailBackupId || envOtp);

  if (!otpAutoEnabled) {
    logger.warn("[adobe-login] Không có cấu hình OTP — chờ 2 phút cho user nhập tay.");
  }

  for (let t = 0; t < 60; t++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes("@AdobeOrg")) return;

    const hasPw = await page.evaluate(() =>
      !!document.querySelector('input[type="password"], input[name="password"]')
    ).catch(() => false);
    if (hasPw) return;

    if (otpAutoEnabled && (t <= 2 || t % 4 === 2)) {
      try {
        const code = mailBackupId
          ? await mailOtpService.fetchOtpFromEmail(mailBackupId, { useEnvFallback: false, senderFilter: "adobe" })
          : await mailOtpService.fetchOtpFromEmail(null, { useEnvFallback: true, senderFilter: "adobe" });
        if (code) {
          logger.info("[adobe-login] OTP nhận được (length=%d), đang điền...", String(code).length);
          const ok = await fillOtpAndSubmit(page, code);
          if (ok) await page.waitForTimeout(5000);
        }
      } catch (err) {
        logger.warn("[adobe-login] Lỗi lấy OTP: %s", err.message);
      }
    }
  }

  if (await isOnVerifyScreen(page)) {
    throw new Error("Hết thời gian chờ nhập OTP (2 phút).");
  }
}

// ────────────────── Token extraction ──────────────────

async function extractTokenFromPage(page) {
  try {
    const hash = await page.evaluate(() => window.location.hash).catch(() => "");
    const m = hash.match(/access_token=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch (_) {}

  try {
    return await page.evaluate(() => {
      const keys = ["adobeid_ims_access_token", "feds_access_token", "ims_token"];
      for (const k of keys) {
        const v = window.localStorage.getItem(k) || window.sessionStorage.getItem(k);
        if (v && v.length > 20) return v;
      }
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (/access.?token/i.test(k)) {
          const v = window.localStorage.getItem(k);
          if (v && v.length > 20) return v;
        }
      }
      return null;
    }).catch(() => null);
  } catch (_) {
    return null;
  }
}

// ────────────────── Cookie format conversion ──────────────────

function toPwCookies(cookies) {
  const now = Math.floor(Date.now() / 1000);
  return cookies
    .filter((c) => c.name && c.domain)
    .filter((c) => !c.expirationDate || c.expirationDate > now)
    .map((c) => ({
      name: c.name,
      value: c.value || "",
      domain: c.domain,
      path: c.path || "/",
      expires: c.expirationDate ? c.expirationDate : -1,
      httpOnly: !!c.httpOnly,
      secure: c.secure !== false,
      sameSite: normalizeSameSite(c.sameSite),
    }));
}

function fromPwCookies(cookies) {
  return cookies.map((c) => ({
    name: c.name,
    value: c.value || "",
    domain: c.domain,
    path: c.path || "/",
    httpOnly: !!c.httpOnly,
    secure: !!c.secure,
    sameSite: c.sameSite || "Lax",
    expirationDate: c.expires > 0 ? c.expires : undefined,
    session: !c.expires || c.expires <= 0,
  }));
}

function normalizeSameSite(s) {
  if (!s) return "Lax";
  const v = String(s).toLowerCase();
  if (v === "strict") return "Strict";
  if (v === "none") return "None";
  return "Lax";
}

module.exports = { loginWithPlaywright };
