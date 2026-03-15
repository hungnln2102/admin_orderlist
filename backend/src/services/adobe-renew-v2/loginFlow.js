/**
 * Adobe Renew V2 — Luồng đăng nhập B2→B9.
 * Từ click Sign in đến khi tới trang đích (account/adminconsole).
 */

const logger = require("../../utils/logger");
const mailOtpService = require("../mailOtpService");

const PASSWORD_SELECTORS = ['input[name="password"]', 'input[type="password"]', 'input#password'];
const SKIP_RE = /^\s*(not now|skip|bỏ qua|later|skip for now)\s*$/i;

/** True nếu URL là trang đã đăng nhập (account, adminconsole, home...), không phải form login. */
function isOnAdobeSite(url) {
  const u = (url || "").toLowerCase();
  if (!u) return false;
  if (u.includes("auth.services.adobe.com") || u.includes("auth.services")) return false;
  if (u.includes("@adobeorg")) return true;
  if (u.includes("adminconsole.adobe.com")) return true;
  if (u.includes("account.adobe.com")) return true;
  if (u.includes("www.adobe.com")) return true;
  if (u.includes("experience.adobe.com")) return true;
  if (u.includes("adobelogin.com") && !u.includes("/signin") && !u.includes("/index.html")) return true;
  if (u.includes("adobe.com") && !u.includes("auth.")) return true;
  return false;
}

async function detectScreen(page, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isOnAdobeSite(page.url())) return "done";
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
    const pwVisible = await page.locator('input[type="password"]:visible').first().isVisible().catch(() => false);
    if (pwVisible) return "password";
    await page.waitForTimeout(1000);
  }
  return "unknown";
}

async function enterPassword(page, password) {
  const passwordInput = page.locator(PASSWORD_SELECTORS.join(", ")).first();
  await passwordInput.waitFor({ state: "visible", timeout: 10000 });
  await passwordInput.fill(password);
  await page.waitForTimeout(200);
  await page.keyboard.press("Enter");
  await page.waitForURL(
    (url) => url.includes("@AdobeOrg") || (url.includes("adminconsole.adobe.com") && !url.includes("auth.")) || (url.includes("account.adobe.com") && !url.includes("auth.")),
    { timeout: 45000 }
  ).catch(() => {});
  await page.waitForTimeout(2500);
}

async function handle2FA(page, mailBackupId) {
  await page.waitForTimeout(1500);
  await page.locator('[data-id="Page-PrimaryButton"], button:has-text("Continue")').first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const otpInput = page.locator('input[autocomplete="one-time-code"], input[inputmode="numeric"], input[maxlength="1"]').first();
  await otpInput.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  for (let t = 0; t < 60; t++) {
    await page.waitForTimeout(2000);
    if (page.url().includes("@AdobeOrg")) return;
    const code = mailBackupId
      ? await mailOtpService.fetchOtpFromEmail(mailBackupId, { useEnvFallback: false, senderFilter: "adobe" })
      : await mailOtpService.fetchOtpFromEmail(null, { useEnvFallback: true, senderFilter: "adobe" });
    if (code) {
      const codeStr = String(code).replace(/\D/g, "").slice(0, 8);
      const multi = await page.locator('input[maxlength="1"]').count() >= 4;
      if (multi) {
        const digits = codeStr.split("").slice(0, 8);
        const inputs = await page.locator('input[maxlength="1"], input[inputmode="numeric"]').all();
        for (let i = 0; i < digits.length && i < inputs.length; i++) {
          await inputs[i].fill(digits[i]);
        }
      } else {
        await otpInput.fill(codeStr);
      }
      await page.waitForTimeout(500);
      await page.locator('[data-id="Page-PrimaryButton"], button[type="submit"]').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(3000);
      return;
    }
  }
  throw new Error("Hết thời gian chờ OTP.");
}

async function maybeSkipSecurityPrompt(page) {
  if (!/progressive-profile|user-security/i.test(page.url())) return;
  await page.getByRole("button", { name: /skip/i }).click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function handleProgressiveProfile(page, mailBackupId) {
  for (let r = 0; r < 6; r++) {
    if (isOnAdobeSite(page.url())) return;
    const isBackup = await page.evaluate(() => /Add a backup email|Thêm địa chỉ email dự phòng/i.test(document.body?.innerText || "")).catch(() => false);
    if (isBackup) {
      await page.getByRole("button", { name: SKIP_RE }).click({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    const isVerify = await page.evaluate(() => /verify|identity|verification|xác minh/i.test(document.body?.innerText || "")).catch(() => false);
    if (isVerify) {
      await handle2FA(page, mailBackupId);
      await page.waitForTimeout(3000);
      continue;
    }
    const isPhone = await page.evaluate(() => /phone|số điện thoại|mobile/i.test(document.body?.innerText || "") && /verify|add/i.test(document.body?.innerText || "")).catch(() => false);
    if (isPhone) {
      await page.getByRole("button", { name: SKIP_RE }).click({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    break;
  }
}

/**
 * Form login khi đã ở trang auth (auth.services / adobelogin). Dùng cho B14 hoặc flow standalone.
 * Nhập email → detectScreen → 2FA/password → skip/progressive → chờ redirect tới Admin Console.
 */
async function doFormLoginOnAuthPage(page, email, password, mailBackupId) {
  try {
    await page.waitForURL(/auth\.services\.adobe\.com|adobelogin\.com/, { timeout: 30000 }).catch(() => {});
    const emailInput = page.locator('input[name="username"], input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 45000 });
    await emailInput.fill(email);
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(3000);

    const screen = await detectScreen(page, 15000);
    if (screen === "2fa") {
      await handle2FA(page, mailBackupId);
      const after2fa = await detectScreen(page, 10000);
      if (after2fa === "password") await enterPassword(page, password);
    } else if (screen === "password") {
      await enterPassword(page, password);
      const afterPw = await detectScreen(page, 10000);
      if (afterPw === "2fa") await handle2FA(page, mailBackupId);
    }

    await maybeSkipSecurityPrompt(page);
    await handleProgressiveProfile(page, mailBackupId);

    await page.waitForFunction(
      () => {
        const h = window.location.href;
        return h.includes("@AdobeOrg") || (/^https?:\/\/([a-z0-9-]+\.)*adobe\.com/i.test(h) && !h.includes("auth.services"));
      },
      { timeout: 90000 }
    ).catch(() => {});
    await page.waitForTimeout(2500);
    return isOnAdobeSite(page.url());
  } catch (e) {
    logger.error("[adobe-v2] doFormLoginOnAuthPage error: %s", e.message);
    return false;
  }
}

/**
 * Chạy luồng đăng nhập B2→B9. Giả định: đang ở adobe.com, chưa đăng nhập, có nút Sign in.
 * Sau khi gọi xong, page sẽ ở trang đích (account/adminconsole).
 * @param {import('playwright').Page} page
 * @param {{ email: string, password: string, mailBackupId?: number }} opts
 */
async function runLoginFlow(page, opts) {
  const { email, password, mailBackupId = null } = opts;

  // ─── B2: Sign in ───
  logger.info("[adobe-v2] B2: Click Sign in");
  const signInClicked = await page.locator("button.profile-comp.secondary-button").first().click({ timeout: 6000 }).then(() => true).catch(async () => {
    return page.getByRole("link", { name: /sign\s*in/i }).first().click({ timeout: 4000 }).then(() => true).catch(() => false);
  });
  if (!signInClicked) throw new Error("Không tìm thấy nút Sign in");
  await page.waitForURL(/auth\.services\.adobe\.com|adobelogin\.com|account\.adobe\.com|adminconsole\.adobe\.com/, { timeout: 20000 }).catch(() => {});

  const urlAfterSignIn = page.url();
  if (!urlAfterSignIn.includes("auth.services") && !urlAfterSignIn.includes("adobelogin")) {
    logger.info("[adobe-v2] Sau B2 đã đăng nhập (cookie còn hiệu lực), url=%s", urlAfterSignIn.slice(0, 80));
    await page.waitForTimeout(2000);
    return;
  }

  // ─── B3–B4: Email + Continue ───
  logger.info("[adobe-v2] B3–B4: Email + Continue");
  const emailInput = page.locator('input[name="username"], input[type="email"], input[name="email"]').first();
  await emailInput.waitFor({ state: "visible", timeout: 45000 });
  await emailInput.fill(email);
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3000);

  const screen = await detectScreen(page, 15000);
  logger.info("[adobe-v2] Sau email → screen: %s", screen);

  if (screen === "2fa") {
    await handle2FA(page, mailBackupId);
    const after2fa = await detectScreen(page, 10000);
    if (after2fa === "password") await enterPassword(page, password);
  } else if (screen === "password") {
    await enterPassword(page, password);
    const afterPw = await detectScreen(page, 10000);
    if (afterPw === "2fa") await handle2FA(page, mailBackupId);
  }

  await maybeSkipSecurityPrompt(page);
  await handleProgressiveProfile(page, mailBackupId);

  // ─── B9: Chờ login xong ───
  const B9_TIMEOUT_MS = 90000;
  const B9_POLL_MS = 3000;
  logger.info("[adobe-v2] B9: Chờ login thành công (tối đa %ds)...", B9_TIMEOUT_MS / 1000);
  page.setDefaultTimeout(B9_TIMEOUT_MS);
  const b9Start = Date.now();
  while (Date.now() - b9Start < B9_TIMEOUT_MS) {
    const url = page.url();
    if (isOnAdobeSite(url)) {
      logger.info("[adobe-v2] B9: Đã tới trang đích → chuyển B10. url=%s", url.slice(0, 100));
      break;
    }
    const bodyText = await page.evaluate(() => (document.body && document.body.innerText) ? document.body.innerText.slice(0, 500) : "").catch(() => "");
    if (/backup email|thêm địa chỉ email dự phòng|add a backup/i.test(bodyText)) {
      logger.info("[adobe-v2] B9: Gặp màn backup email, bấm Skip...");
      await page.getByRole("button", { name: /not now|skip|bỏ qua|later/i }).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    if (/phone|số điện thoại|mobile|verify.*phone/i.test(bodyText) && /add|verify|thêm|xác minh/i.test(bodyText)) {
      logger.info("[adobe-v2] B9: Gặp màn phone, bấm Skip...");
      await page.getByRole("button", { name: /not now|skip|bỏ qua|later/i }).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2000);
      continue;
    }
    const elapsed = Math.round((Date.now() - b9Start) / 1000);
    logger.info("[adobe-v2] B9: Chờ redirect (%ds) url=%s", elapsed, url.slice(0, 100));
    await page.waitForTimeout(B9_POLL_MS);
  }
  const finalUrl = page.url();
  if (!isOnAdobeSite(finalUrl)) {
    throw new Error(`B9 timeout: sau ${B9_TIMEOUT_MS / 1000}s vẫn chưa tới account/adminconsole. URL hiện tại: ${finalUrl.slice(0, 120)}`);
  }
  await page.waitForTimeout(2000);
}

module.exports = {
  runLoginFlow,
  isOnAdobeSite,
  doFormLoginOnAuthPage,
};
