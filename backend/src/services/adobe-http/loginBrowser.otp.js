const logger = require("../../utils/logger");
const mailOtpService = require("../mailOtpService");

async function isOnVerifyScreen(page) {
  try {
    const url = page.url();
    const urlPath = url.split("?")[0];
    if (/challenge|verify|2fa|mfa|otp/i.test(urlPath)) {
      return true;
    }

    return page
      .evaluate(() => {
        const text = (document.body?.innerText || "").toLowerCase();
        return (
          text.includes("verify your identity") ||
          text.includes("verify it's you") ||
          text.includes("verification code") ||
          text.includes("security verification") ||
          text.includes("enter the code") ||
          text.includes("we sent a code") ||
          text.includes("we've sent") ||
          text.includes("we'll send") ||
          text.includes("send a code") ||
          text.includes("email verification") ||
          text.includes("two-step verification") ||
          text.includes("xác minh") ||
          text.includes("mã xác nhận") ||
          /check your .*(email|inbox)/i.test(text) ||
          /enter.*\d.*digit/i.test(text)
        );
      })
      .catch(() => false);
  } catch (_) {
    return false;
  }
}

async function waitForOtpInput(page, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = await page
      .evaluate(() => {
        const selectors = [
          'input[autocomplete="one-time-code"]',
          'input[name*="code"]',
          'input[name*="otp"]',
          'input[placeholder*="ode"]',
          'input[type="text"][inputmode="numeric"]',
          'input[data-testid*="code"]',
        ];
        for (const selector of selectors) {
          if (document.querySelector(selector)) {
            return true;
          }
        }
        const numericInputs = document.querySelectorAll('input[maxlength="1"]');
        return numericInputs.length >= 4;
      })
      .catch(() => false);

    if (found) {
      return true;
    }

    const url = page.url();
    if (url.includes("@AdobeOrg") || !url.includes("auth.services")) {
      return false;
    }

    await page.waitForTimeout(1000);
  }
  return false;
}

async function tryClickContinue(page) {
  try {
    await page.click('[data-id="Page-PrimaryButton"]', { timeout: 8000 });
    logger.info("[adobe-login] Click Continue: strategy 1 (data-id selector) OK");
    return true;
  } catch (error) {
    logger.debug("[adobe-login] Strategy 1 fail: %s", error.message);
  }

  try {
    await page
      .getByRole("button", { name: /continue/i })
      .click({ timeout: 5000 });
    logger.info("[adobe-login] Click Continue: strategy 2 (getByRole) OK");
    return true;
  } catch (error) {
    logger.debug("[adobe-login] Strategy 2 fail: %s", error.message);
  }

  try {
    await page.getByText("Continue", { exact: true }).click({ timeout: 3000 });
    logger.info("[adobe-login] Click Continue: strategy 3 (getByText) OK");
    return true;
  } catch (error) {
    logger.debug("[adobe-login] Strategy 3 fail: %s", error.message);
  }

  const clicked = await page
    .evaluate(() => {
      const primaryButton = document.querySelector('[data-id="Page-PrimaryButton"]');
      if (primaryButton) {
        primaryButton.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
        return "data-id";
      }
      for (const element of document.querySelectorAll("button, [role='button']")) {
        if (/\bcontinue\b/i.test(element.textContent || "")) {
          element.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true })
          );
          return "text-match";
        }
      }
      return null;
    })
    .catch(() => null);

  if (clicked) {
    logger.info(
      "[adobe-login] Click Continue: strategy 4 (JS dispatch) OK via %s",
      clicked
    );
    return true;
  }

  logger.warn("[adobe-login] Tất cả click strategies đều thất bại");
  return false;
}

async function clickButtonByLabel(page, re, timeoutMs = 15000) {
  try {
    await page
      .getByRole("button", { name: re })
      .click({ timeout: Math.min(timeoutMs, 8000) });
    logger.info("[adobe-login] clickButtonByLabel(%s): getByRole OK", re.source);
    return true;
  } catch (_) {}

  try {
    await page.getByText(re).first().click({ timeout: 5000 });
    logger.info("[adobe-login] clickButtonByLabel(%s): getByText OK", re.source);
    return true;
  } catch (_) {}

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const clicked = await page
      .evaluate(
        (source, flags) => {
          const regex = new RegExp(source, flags);
          for (const element of document.querySelectorAll(
            "button, [role='button'], a, input[type='submit']"
          )) {
            const text = (
              element.textContent ||
              element.getAttribute("aria-label") ||
              ""
            ).trim();
            if (regex.test(text)) {
              const rect = element.getBoundingClientRect();
              if (rect.width > 2 && rect.height > 2) {
                element.dispatchEvent(
                  new MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                  })
                );
                return true;
              }
            }
          }
          return false;
        },
        re.source,
        re.flags
      )
      .catch(() => false);

    if (clicked) {
      logger.info(
        "[adobe-login] clickButtonByLabel(%s): DOM dispatch OK",
        re.source
      );
      return true;
    }
    await page.waitForTimeout(500);
  }

  logger.warn("[adobe-login] clickButtonByLabel(%s): thất bại", re.source);
  return false;
}

async function tryClickSubmit(page) {
  const button = page
    .locator(
      '[data-id="Page-PrimaryButton"], button[data-variant="accent"], button[type="submit"]'
    )
    .first();
  if (await button.isVisible().catch(() => false)) {
    await button.click().catch(() => {});
  }
}

async function fillOtpAndSubmit(page, code) {
  if (!code) {
    return false;
  }
  const codeStr = String(code).replace(/\D/g, "").slice(0, 8);

  const countInputs = await page
    .evaluate(() => {
      const selectors = [
        'input[autocomplete="one-time-code"]',
        'input[inputmode="numeric"]',
        'input[maxlength="1"]',
        'input[type="tel"]',
      ];
      for (const selector of selectors) {
        const list = document.querySelectorAll(selector);
        if (list.length >= 4 && list.length <= 8) {
          return list.length;
        }
      }
      return 0;
    })
    .catch(() => 0);

  if (countInputs >= 4) {
    const digits = codeStr.slice(0, countInputs).split("");
    const inputs = await page
      .locator(
        'input[autocomplete="one-time-code"], input[inputmode="numeric"], input[maxlength="1"], input[type="tel"]'
      )
      .all();
    const slice = inputs.slice(0, countInputs);
    for (let index = 0; index < digits.length && index < slice.length; index++) {
      await slice[index].click();
      await page.waitForTimeout(80);
      await page.keyboard.type(digits[index], { delay: 50 });
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(500);
    await tryClickSubmit(page);
    return true;
  }

  for (const selector of [
    'input[autocomplete="one-time-code"]',
    'input[name*="code"]',
    'input[placeholder*="ode"]',
    'input[type="text"][inputmode="numeric"]',
  ]) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
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

  for (let attempt = 0; attempt < 60; attempt++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes("@AdobeOrg")) {
      return;
    }

    const hasPassword = await page
      .evaluate(
        () =>
          !!document.querySelector(
            'input[type="password"], input[name="password"]'
          )
      )
      .catch(() => false);
    if (hasPassword) {
      return;
    }

    if (otpAutoEnabled && (attempt <= 2 || attempt % 4 === 2)) {
      try {
        const code = mailBackupId
          ? await mailOtpService.fetchOtpFromEmail(mailBackupId, {
              useEnvFallback: false,
              senderFilter: "adobe",
            })
          : await mailOtpService.fetchOtpFromEmail(null, {
              useEnvFallback: true,
              senderFilter: "adobe",
            });
        if (code) {
          logger.info(
            "[adobe-login] OTP nhận được (length=%d), đang điền...",
            String(code).length
          );
          const ok = await fillOtpAndSubmit(page, code);
          if (ok) {
            await page.waitForTimeout(5000);
          }
        }
      } catch (error) {
        logger.warn("[adobe-login] Lỗi lấy OTP: %s", error.message);
      }
    }
  }

  if (await isOnVerifyScreen(page)) {
    throw new Error("Hết thời gian chờ nhập OTP (2 phút).");
  }
}

async function handle2FA(page, mailBackupId) {
  logger.info(
    "[adobe-login] Xử lý 2FA screen — url: %s",
    page.url().slice(0, 120)
  );

  await page.waitForTimeout(1500);
  let clicked = await tryClickContinue(page);
  if (!clicked) {
    await page.waitForTimeout(3000);
    clicked = await tryClickContinue(page);
  }
  logger.info("[adobe-login] Bấm Continue: %s", clicked ? "OK" : "THẤT BẠI");

  if (!clicked) {
    logger.warn(
      "[adobe-login] Không bấm được Continue — thử bấm bất kỳ button nào visible"
    );
    await page
      .evaluate(() => {
        const buttons = document.querySelectorAll("button, [role='button']");
        for (const button of buttons) {
          const rect = button.getBoundingClientRect();
          if (rect.width > 30 && rect.height > 20) {
            button.click();
            break;
          }
        }
      })
      .catch(() => {});
  }

  logger.info("[adobe-login] Đợi trang OTP input xuất hiện...");
  const otpInputAppeared = await waitForOtpInput(page, 15000);
  logger.info(
    "[adobe-login] OTP input: %s — url: %s",
    otpInputAppeared ? "có" : "chưa thấy",
    page.url().slice(0, 120)
  );

  logger.info("[adobe-login] Adobe đã gửi OTP → chờ email từ IMAP...");
  await waitForOtpAndFill(page, mailBackupId);
  logger.info("[adobe-login] Sau OTP — url: %s", page.url().slice(0, 120));
}

module.exports = {
  isOnVerifyScreen,
  handle2FA,
  clickButtonByLabel,
  waitForOtpAndFill,
};
