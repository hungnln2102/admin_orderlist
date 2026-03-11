/**
 * Thực hiện đăng nhập Adobe (cookie hoặc email/password).
 * Chỉ làm bước login; không vào account.adobe.com hay Admin Console.
 * Sau khi xong, page ở trạng thái đã đăng nhập (adobe.com hoặc URL chứa @AdobeOrg).
 *
 * @param {import('puppeteer').Page} page
 * @param {object} opts
 * @param {string} [opts.email] - Email (dùng khi login bằng form)
 * @param {string} [opts.password] - Mật khẩu (dùng khi login bằng form)
 * @param {boolean} [opts.useCookies] - true nếu dùng cookie thay vì form
 * @param {Array<object>} [opts.cookiesToUse] - Mảng cookie (từ file hoặc DB)
 * @param {number|null} [opts.mailBackupId] - ID mail backup cho OTP (tùy chọn)
 */
async function performLogin(page, opts = {}) {
  const logger = require("../../utils/logger");
  const { ADOBE_LOGIN_URL } = require("./constants");
  const { maybeSkipSecurityPrompt, waitForPassword, fillWithKeyboard, tryClickContinue, clickButtonByText } =
    require("./loginHelpers");
  const { isOnVerifyScreen, waitForOtpAndFill } = require("./otpFlow");
  const { isOnAddBackupEmailScreen, isOnVerifyPhoneScreen, skipVerifyPhone } = require("./backupEmailFlow");

  const { email, password, useCookies, cookiesToUse = [], mailBackupId } = opts;

  if (useCookies && Array.isArray(cookiesToUse) && cookiesToUse.length > 0) {
    logger.info("[adobe] Đăng nhập bằng cookies: %s cookie", cookiesToUse.length);
    try {
      await page.goto("https://www.adobe.com", {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
    } catch (e) {
      logger.warn("[adobe] Goto adobe.com (cookies, bước 1) timeout/failed, tiếp tục với URL hiện tại", {
        error: e?.message,
      });
    }
    await page.setCookie(...cookiesToUse);
    logger.info("[adobe] Đã set cookies, chuyển sang adobe.com...");
    try {
      await page.goto("https://www.adobe.com", {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
    } catch (e) {
      logger.warn("[adobe] Goto adobe.com (cookies, bước 2) timeout/failed, tiếp tục với URL hiện tại", {
        error: e?.message,
      });
    }
    await new Promise((r) => setTimeout(r, 3000));
    await maybeSkipSecurityPrompt(page);

    const hasVerifyAfterCookies = await page
      .evaluate(() => (document.body?.innerText || "").includes("Verify your identity"))
      .catch(() => false);
    if (hasVerifyAfterCookies) {
      logger.info("[adobe] Gặp Verify identity sau cookies — bấm Continue ...");
      const tryClickCookieContinue = async () => {
        try {
          const btn = await page.waitForSelector('[data-id="Page-PrimaryButton"]', {
            visible: true,
            timeout: 8000,
          });
          if (btn) {
            await btn.evaluate((el) => el.scrollIntoView({ block: "center" }));
            await new Promise((r) => setTimeout(r, 300));
            await btn.evaluate((el) => el.click());
            return true;
          }
        } catch (_) {}
        const clicked = await page.evaluate(() => {
          const nodes = document.querySelectorAll("button, [role='button']");
          for (const el of nodes) {
            if (/\b(continue|tiếp\s*tục)\b/i.test((el.textContent || "").trim())) {
              el.click();
              return true;
            }
          }
          return false;
        });
        return !!clicked;
      };
      await tryClickCookieContinue();
      await new Promise((r) => setTimeout(r, 3000));
      if (await isOnVerifyScreen(page)) {
        logger.info("[adobe] Vẫn trên màn Verify — chạy luồng lấy OTP và điền.");
        await waitForOtpAndFill(page, { mailBackupId });
      }
    }
  } else {
    const handle2FAStep = async (stepLabel) => {
      if (!(await isOnVerifyScreen(page))) return;
      logger.info("[adobe] 2FA: %s — bấm Continue ...", stepLabel);
      await new Promise((r) => setTimeout(r, 2000));
      const clicked = await tryClickContinue(page);
      if (!clicked) {
        throw new Error("Không tìm thấy nút Continue trên màn hình Verify your identity.");
      }
      await new Promise((r) => setTimeout(r, 3000));
      await waitForOtpAndFill(page, { mailBackupId });
    };

    logger.info("[adobe] Login adobe.com — form: Tài khoản => 2FA => Mật khẩu => 2FA(nếu có) => Skip SĐT");
    try {
      await page.goto(ADOBE_LOGIN_URL, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
    } catch (e) {
      logger.warn("[adobe] Goto ADOBE_LOGIN_URL timeout/failed, tiếp tục với URL hiện tại", {
        error: e?.message,
      });
    }
    const emailInput = await page.waitForSelector(
      'input[name="username"], input[type="email"], input[name="email"]',
      { timeout: 45000 }
    );
    await fillWithKeyboard(page, emailInput, email, 25);
    await new Promise((r) => setTimeout(r, 150));
    await page.keyboard.press("Enter");
    await Promise.race([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 90000 }),
      new Promise((r) => setTimeout(r, 5000)),
    ]).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    await handle2FAStep("sau tài khoản");

    const passwordEl = await waitForPassword(page);
    await fillWithKeyboard(page, passwordEl, password, 25);
    await new Promise((r) => setTimeout(r, 150));
    await page.keyboard.press("Enter");
    await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 90000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 5000));

    await handle2FAStep("sau mật khẩu");

    await maybeSkipSecurityPrompt(page);
  }

  // Xử lý màn Add backup email (bỏ qua — bấm Not now), OTP verify, bỏ qua verify phone
  const handleProgressiveProfileSteps = async () => {
    const maxRound = 6;
    for (let round = 0; round < maxRound; round++) {
      const url = page.url() || "";
      if (url.indexOf("@AdobeOrg") !== -1 || (url.includes("adobe.com") && !url.includes("auth.services"))) {
        return;
      }
      if (await isOnAddBackupEmailScreen(page)) {
        logger.info("[adobe] Gặp màn Add backup email — bấm Not now để bỏ qua.");
        const notNow = await page.evaluate(() => {
          const labels = ["Not now", "Bỏ qua", "Skip", "Later"];
          const norm = (s) => (s || "").trim();
          for (const btn of document.querySelectorAll("button, [role='button']")) {
            const t = norm(btn.innerText || btn.textContent);
            if (labels.some((l) => t === l || t.includes(l))) {
              btn.click();
              return true;
            }
          }
          return false;
        });
        if (notNow) await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (await isOnVerifyScreen(page)) {
        await waitForOtpAndFill(page, { mailBackupId });
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      if (await isOnVerifyPhoneScreen(page)) {
        await skipVerifyPhone(page, clickButtonByText);
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      break;
    }
  };

  await handleProgressiveProfileSteps();

  logger.info("[adobe] Chờ trang đã đăng nhập (adobe.com/* hoặc @AdobeOrg), tối đa 90s...");
  try {
    await page.waitForFunction(
      () => {
        const h = window.location.href;
        return (
          h.indexOf("@AdobeOrg") !== -1 ||
          (/^https?:\/\/([a-z0-9-]+\.)*adobe\.com/i.test(h) &&
            h.indexOf("auth.services") === -1)
        );
      },
      { timeout: 90000 }
    );
  } catch (e) {
    const stillVerifyIdentity = await page
      .evaluate(() => (document.body?.innerText || "").includes("Verify your identity"))
      .catch(() => false);
    const msg = stillVerifyIdentity
      ? "Adobe yêu cầu xác minh danh tính (Verify your identity). Hoàn tất xác minh thủ công rồi thử lại."
      : "Login thất bại: không truy cập được trang sau đăng nhập (sai mật khẩu, 2FA hoặc flow Adobe đổi).";
    throw new Error(msg);
  }
  await new Promise((r) => setTimeout(r, 2500));
  logger.info("[adobe] Login xong, URL: %s", page.url().slice(0, 80));
}

module.exports = {
  performLogin,
};
