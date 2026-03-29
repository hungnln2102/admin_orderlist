const logger = require("../../utils/logger");
const { PASSWORD_SELECTORS, SKIP_RE, isOnAdobeSite } = require("./loginBrowser.shared");
const {
  isOnVerifyScreen,
  clickButtonByLabel,
  waitForOtpAndFill,
} = require("./loginBrowser.otp");

async function detectScreen(page, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (isOnAdobeSite(url)) {
      return "done";
    }

    const screen = await page
      .evaluate(() => {
        for (const element of document.querySelectorAll(
          "h1, h2, h3, [class*='Heading']"
        )) {
          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) {
            continue;
          }
          const text = element.textContent.trim().toLowerCase();
          if (/verify|identity|verification|xác minh/.test(text)) {
            return "2fa";
          }
          if (/password|mật khẩu/.test(text)) {
            return "password";
          }
          if (/enter your email|sign in|đăng nhập/.test(text)) {
            return "email";
          }
        }
        return null;
      })
      .catch(() => null);

    if (screen === "2fa" || screen === "password") {
      return screen;
    }

    const passwordVisible = await page
      .locator('input[type="password"]:visible')
      .first()
      .isVisible()
      .catch(() => false);
    if (passwordVisible) {
      return "password";
    }

    await page.waitForTimeout(1000);
  }

  const bodyText = await page
    .evaluate(() => (document.body?.innerText || "").slice(0, 300))
    .catch(() => "");
  logger.warn(
    "[adobe-login] detectScreen timeout, url=%s, body=%s",
    page.url(),
    bodyText
  );
  return "unknown";
}

async function waitForPasswordField(page) {
  for (const selector of PASSWORD_SELECTORS) {
    try {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: "visible", timeout: 10000 });
      return locator;
    } catch (_) {}
  }

  throw new Error("Không tìm thấy ô mật khẩu.");
}

async function enterPassword(page, password) {
  logger.info("[adobe-login] Nhập password...");
  const passwordInput = await waitForPasswordField(page);
  await passwordInput.click();
  await page.keyboard.type(password, { delay: 25 });
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  try {
    await page.waitForURL(
      (url) =>
        url.includes("@AdobeOrg") ||
        (url.includes("adminconsole.adobe.com") &&
          !url.includes("auth.services")),
      { timeout: 45000 }
    );
  } catch (_) {
    logger.warn("[adobe-login] Chờ URL Admin Console timeout, tiếp tục...");
  }
  await page.waitForTimeout(2500);
}

async function maybeSkipSecurityPrompt(page) {
  const url = page.url();
  if (!/progressive-profile\/user-security|user-security/i.test(url)) {
    return;
  }

  logger.info("[adobe-login] Gặp security prompt, bấm Skip...");
  await clickButtonByLabel(page, /^\s*skip\s*$/i, 15000);
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function handleProgressiveProfile(page, mailBackupId) {
  for (let round = 0; round < 6; round++) {
    const url = page.url();
    if (
      url.includes("@AdobeOrg") ||
      (url.includes("adobe.com") && !url.includes("auth.services"))
    ) {
      return;
    }

    const isBackup = await page
      .evaluate(() => {
        const text = document.body?.innerText || "";
        return /Add a backup email|Secondary email|Thêm địa chỉ email dự phòng/i.test(
          text
        );
      })
      .catch(() => false);
    if (isBackup) {
      logger.info("[adobe-login] Gặp Add backup email — bấm Not now");
      await clickButtonByLabel(page, SKIP_RE, 8000);
      await page.waitForTimeout(2000);
      continue;
    }

    if (await isOnVerifyScreen(page)) {
      await waitForOtpAndFill(page, mailBackupId);
      await page.waitForTimeout(3000);
      continue;
    }

    const isPhone = await page
      .evaluate(() => {
        const text = document.body?.innerText || "";
        const urlText = window.location.href;
        return (
          (/phone|số điện thoại|telephone|mobile/i.test(text) &&
            /verify|add|thêm|xác minh/i.test(text)) ||
          /progressive-profile.*phone|add-phone|verify-phone/i.test(urlText)
        );
      })
      .catch(() => false);
    if (isPhone) {
      logger.info("[adobe-login] Gặp verify phone — bấm Not now/Skip");
      await clickButtonByLabel(page, SKIP_RE, 8000);
      await page.waitForTimeout(2500);
      continue;
    }

    break;
  }
}

module.exports = {
  detectScreen,
  enterPassword,
  maybeSkipSecurityPrompt,
  handleProgressiveProfile,
};
