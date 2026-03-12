/**
 * Login Adobe bằng Playwright headless Chromium.
 * Chỉ mở browser để login, sau đó đóng ngay.
 * Trả về cookies + access token cho HTTP client dùng tiếp.
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
const mailOtpService = require("../mailOtpService");

// Navigate tới Admin Console → Adobe tự redirect đến login page với params hợp lệ.
// Không hardcode relay/session token — tránh "Something went wrong".
const ADOBE_ENTRY_URL = "https://adminconsole.adobe.com/";

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

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  logger.info("[adobe-login] Khởi động Playwright Chromium (headless=%s)...", headless);
  const browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 80,
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

    // Bắt access_token từ URL redirect (token xuất hiện rất ngắn trong URL fragment)
    page.on("framenavigated", async (frame) => {
      if (frame !== page.mainFrame()) return;
      try {
        const url = frame.url() || "";
        const m = url.match(/access_token=([^&#]+)/);
        if (m && !accessToken) {
          accessToken = decodeURIComponent(m[1]);
          logger.info("[adobe-login] Captured token từ frame URL");
        }
        if (!accessToken) {
          const hash = await frame.evaluate(() => window.location.hash).catch(() => "");
          const h = hash.match(/access_token=([^&]+)/);
          if (h) {
            accessToken = decodeURIComponent(h[1]);
            logger.info("[adobe-login] Captured token từ URL hash");
          }
        }
      } catch (_) {}
    });

    // Bắt token từ response URL (backup — IMS redirect chain)
    page.on("response", (response) => {
      if (accessToken) return;
      try {
        const url = response.url() || "";
        const m = url.match(/access_token=([^&#]+)/);
        if (m) {
          accessToken = decodeURIComponent(m[1]);
          logger.info("[adobe-login] Captured token từ response URL");
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
        logger.info("[adobe-login] [URL] Sau cookie-login navigate: %s", url1.slice(0, 120));

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
    await page.goto(ADOBE_ENTRY_URL, { waitUntil: "domcontentloaded", timeout: 90000 }).catch((e) => {
      logger.warn("[adobe-login] Goto login timeout: %s", e.message);
    });
    // Đợi redirect tới trang login (auth.services.adobe.com)
    await page.waitForURL(/auth\.services\.adobe\.com|adobelogin\.com/, { timeout: 30000 }).catch(() => {});
    logger.info("[adobe-login] [URL] Đã redirect tới login: %s", page.url().slice(0, 120));

    // B1: Nhập email
    logger.info("[adobe-login] [URL] Trang login: %s", page.url().slice(0, 120));
    const emailInput = page.locator('input[name="username"], input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 45000 });
    await emailInput.click();
    await page.keyboard.type(email, { delay: 25 });
    await page.waitForTimeout(150);
    await page.keyboard.press("Enter");

    // B2: Đợi xem trang nào xuất hiện (2FA / password / redirect)
    logger.info("[adobe-login] Đợi phản hồi sau email...");
    const afterEmail = await detectScreen(page, 15000);
    logger.info("[adobe-login] Sau email → screen: %s", afterEmail);

    // B3: Xử lý theo screen
    if (afterEmail === "2fa") {
      logger.info("[adobe-login] [URL] Trước 2FA: %s", page.url().slice(0, 120));
      await handle2FA(page, mailBackupId);
      logger.info("[adobe-login] [URL] Sau 2FA: %s", page.url().slice(0, 120));
      const after2fa = await detectScreen(page, 10000);
      logger.info("[adobe-login] Sau 2FA → screen: %s", after2fa);
      if (after2fa === "password") {
        await enterPassword(page, password);
        logger.info("[adobe-login] [URL] Sau password: %s", page.url().slice(0, 120));
      }
    } else if (afterEmail === "password") {
      await enterPassword(page, password);
      logger.info("[adobe-login] [URL] Sau password: %s", page.url().slice(0, 120));
      const afterPw = await detectScreen(page, 10000);
      logger.info("[adobe-login] Sau password → screen: %s", afterPw);
      if (afterPw === "2fa") {
        logger.info("[adobe-login] [URL] Trước 2FA: %s", page.url().slice(0, 120));
        await handle2FA(page, mailBackupId);
        logger.info("[adobe-login] [URL] Sau 2FA: %s", page.url().slice(0, 120));
      }
    } else if (afterEmail === "unknown") {
      logger.warn("[adobe-login] [URL] Unknown screen: %s", page.url().slice(0, 120));
    }

    // B4: Skip security prompt + progressive profile
    await maybeSkipSecurityPrompt(page);
    await handleProgressiveProfile(page, mailBackupId);

    // B5: Chờ login thành công
    if (!isOnAdobeSite(page.url())) {
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
    }

    // B6: Lấy token — thử nhiều lần (SPA cần thời gian initialize)
    if (!accessToken) accessToken = await extractTokenFromPage(page);

    // B7: Nếu chưa ở Admin Console, navigate tới đó
    const currentUrl = page.url();
    if (!currentUrl.includes("adminconsole.adobe.com")) {
      logger.info("[adobe-login] Navigate tới Admin Console để lấy cookies...");
      await page.goto("https://adminconsole.adobe.com/", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(5000);
    }

    // B8: Retry token extraction — đợi SPA set localStorage
    if (!accessToken) {
      for (let i = 0; i < 5; i++) {
        accessToken = await extractTokenFromPage(page);
        if (accessToken) break;
        await page.waitForTimeout(2000);
      }
    }
    logger.info("[adobe-login] Token sau tất cả extraction: %s", accessToken ? "CÓ" : "NULL");

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
    // Chỉ check URL path (trước dấu ?), không check query string
    const urlPath = url.split("?")[0];
    if (/challenge|verify|2fa|mfa|otp/i.test(urlPath)) return true;

    return page
      .evaluate(() => {
        const t = (document.body?.innerText || "").toLowerCase();
        return (
          t.includes("verify your identity") ||
          t.includes("verify it's you") ||
          t.includes("verification code") ||
          t.includes("security verification") ||
          t.includes("enter the code") ||
          t.includes("we sent a code") ||
          t.includes("we've sent") ||
          t.includes("we'll send") ||
          t.includes("send a code") ||
          t.includes("email verification") ||
          t.includes("two-step verification") ||
          t.includes("xác minh") ||
          t.includes("mã xác nhận") ||
          /check your .*(email|inbox)/i.test(t) ||
          /enter.*\d.*digit/i.test(t)
        );
      })
      .catch(() => false);
  } catch (_) {
    return false;
  }
}

/**
 * Detect screen hiện tại dựa vào HEADING hiển thị (đáng tin nhất).
 * SPA Adobe ẩn/hiện elements bằng CSS, nên check DOM input không tin được.
 */
async function detectScreen(page, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (isOnAdobeSite(url)) return "done";

    // Check heading text hiển thị — nguồn chính xác nhất
    const screen = await page.evaluate(() => {
      for (const el of document.querySelectorAll("h1, h2, h3, [class*='Heading']")) {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const t = el.textContent.trim().toLowerCase();
        if (/verify|identity|verification|xác minh/.test(t)) return "2fa";
        if (/password|mật khẩu/.test(t)) return "password";
        if (/enter your email|sign in|đăng nhập/.test(t)) return "email";
      }
      return null;
    }).catch(() => null);

    if (screen === "2fa" || screen === "password") return screen;

    // Fallback: Playwright isVisible (đáng tin hơn DOM check)
    const pwVisible = await page.locator('input[type="password"]:visible').first().isVisible().catch(() => false);
    if (pwVisible) return "password";

    await page.waitForTimeout(1000);
  }

  const bodyText = await page.evaluate(() =>
    (document.body?.innerText || "").slice(0, 300)
  ).catch(() => "");
  logger.warn("[adobe-login] detectScreen timeout, url=%s, body=%s", page.url(), bodyText);
  return "unknown";
}

function isOnAdobeSite(url) {
  return (
    url.includes("@AdobeOrg") ||
    (url.includes("adminconsole.adobe.com") && !url.includes("auth.services")) ||
    (url.includes("adobe.com/home") && !url.includes("auth.services"))
  );
}

async function enterPassword(page, password) {
  logger.info("[adobe-login] Nhập password...");
  const passwordInput = await waitForPasswordField(page);
  await passwordInput.click();
  await page.keyboard.type(password, { delay: 25 });
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

async function handle2FA(page, mailBackupId) {
  logger.info("[adobe-login] Xử lý 2FA screen — url: %s", page.url().slice(0, 120));

  // B1: Bấm Continue → Adobe gửi OTP qua email
  await page.waitForTimeout(1500);
  let clicked = await tryClickContinue(page);
  if (!clicked) {
    // Retry: đợi thêm rồi thử lại
    await page.waitForTimeout(3000);
    clicked = await tryClickContinue(page);
  }
  logger.info("[adobe-login] Bấm Continue: %s", clicked ? "OK" : "THẤT BẠI");

  if (!clicked) {
    logger.warn("[adobe-login] Không bấm được Continue — thử bấm bất kỳ button nào visible");
    await page.evaluate(() => {
      const btns = document.querySelectorAll("button, [role='button']");
      for (const b of btns) {
        const r = b.getBoundingClientRect();
        if (r.width > 30 && r.height > 20) { b.click(); break; }
      }
    }).catch(() => {});
  }

  // B2: Đợi trang chuyển sang ô nhập OTP (xác nhận Adobe đã gửi mail)
  logger.info("[adobe-login] Đợi trang OTP input xuất hiện...");
  const otpInputAppeared = await waitForOtpInput(page, 15000);
  logger.info("[adobe-login] OTP input: %s — url: %s",
    otpInputAppeared ? "có" : "chưa thấy", page.url().slice(0, 120));

  // B3: Bây giờ mới vào IMAP lấy OTP (Adobe đã gửi mail sau khi bấm Continue)
  logger.info("[adobe-login] Adobe đã gửi OTP → chờ email từ IMAP...");
  await waitForOtpAndFill(page, mailBackupId);
  logger.info("[adobe-login] Sau OTP — url: %s", page.url().slice(0, 120));
}

async function waitForOtpInput(page, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = await page.evaluate(() => {
      const selectors = [
        'input[autocomplete="one-time-code"]',
        'input[name*="code"]',
        'input[name*="otp"]',
        'input[placeholder*="ode"]',
        'input[type="text"][inputmode="numeric"]',
        'input[data-testid*="code"]',
      ];
      for (const s of selectors) {
        if (document.querySelector(s)) return true;
      }
      // Check for 6 separate digit inputs
      const numInputs = document.querySelectorAll('input[maxlength="1"]');
      if (numInputs.length >= 4) return true;
      return false;
    }).catch(() => false);

    if (found) return true;

    // Nếu đã chuyển sang trang khác (password, admin console) → không cần OTP
    const url = page.url();
    if (url.includes("@AdobeOrg") || !url.includes("auth.services")) return false;

    await page.waitForTimeout(1000);
  }
  return false;
}

async function tryClickContinue(page) {
  // Strategy 1: Playwright click trực tiếp (giả lập mouse thật)
  try {
    await page.click('[data-id="Page-PrimaryButton"]', { timeout: 8000 });
    logger.info("[adobe-login] Click Continue: strategy 1 (data-id selector) OK");
    return true;
  } catch (e) {
    logger.debug("[adobe-login] Strategy 1 fail: %s", e.message);
  }

  // Strategy 2: getByRole (semantic — tìm button "Continue")
  try {
    await page.getByRole("button", { name: /continue/i }).click({ timeout: 5000 });
    logger.info("[adobe-login] Click Continue: strategy 2 (getByRole) OK");
    return true;
  } catch (e) {
    logger.debug("[adobe-login] Strategy 2 fail: %s", e.message);
  }

  // Strategy 3: getByText
  try {
    await page.getByText("Continue", { exact: true }).click({ timeout: 3000 });
    logger.info("[adobe-login] Click Continue: strategy 3 (getByText) OK");
    return true;
  } catch (e) {
    logger.debug("[adobe-login] Strategy 3 fail: %s", e.message);
  }

  // Strategy 4: JavaScript DOM click (bypass mọi overlay/interceptor)
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('[data-id="Page-PrimaryButton"]');
    if (btn) {
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return "data-id";
    }
    for (const el of document.querySelectorAll("button, [role='button']")) {
      if (/\bcontinue\b/i.test(el.textContent || "")) {
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        return "text-match";
      }
    }
    return null;
  }).catch(() => null);

  if (clicked) {
    logger.info("[adobe-login] Click Continue: strategy 4 (JS dispatch) OK via %s", clicked);
    return true;
  }

  logger.warn("[adobe-login] Tất cả click strategies đều thất bại");
  return false;
}

async function waitForPasswordField(page) {
  for (const sel of PASSWORD_SELECTORS) {
    try {
      const loc = page.locator(sel).first();
      await loc.waitFor({ state: "visible", timeout: 10000 });
      return loc;
    } catch (_) {}
  }
  throw new Error("Không tìm thấy ô mật khẩu.");
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
  // Strategy 1: Playwright getByRole button
  try {
    await page.getByRole("button", { name: re }).click({ timeout: Math.min(timeoutMs, 8000) });
    logger.info("[adobe-login] clickButtonByLabel(%s): getByRole OK", re.source);
    return true;
  } catch (_) {}

  // Strategy 2: Playwright getByText
  try {
    await page.getByText(re).first().click({ timeout: 5000 });
    logger.info("[adobe-login] clickButtonByLabel(%s): getByText OK", re.source);
    return true;
  } catch (_) {}

  // Strategy 3: DOM dispatchEvent (fallback)
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const clicked = await page.evaluate(
      (src, flags) => {
        const re = new RegExp(src, flags);
        for (const el of document.querySelectorAll("button, [role='button'], a, input[type='submit']")) {
          const text = (el.textContent || el.getAttribute("aria-label") || "").trim();
          if (re.test(text)) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 2 && rect.height > 2) {
              el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
              return true;
            }
          }
        }
        return false;
      },
      re.source, re.flags
    ).catch(() => false);
    if (clicked) {
      logger.info("[adobe-login] clickButtonByLabel(%s): DOM dispatch OK", re.source);
      return true;
    }
    await page.waitForTimeout(500);
  }
  logger.warn("[adobe-login] clickButtonByLabel(%s): thất bại", re.source);
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

module.exports = {
  loginWithPlaywright,
  toPwCookies,
  fromPwCookies,
  detectScreen,
  enterPassword,
  handle2FA,
  maybeSkipSecurityPrompt,
  handleProgressiveProfile,
  extractTokenFromPage,
};
