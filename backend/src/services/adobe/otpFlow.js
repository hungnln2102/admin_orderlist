/**
 * Điền OTP từ mail (IMAP) vào form Verify your identity của Adobe.
 */

const mailOtpService = require("../mailOtpService");

/**
 * @param {import('puppeteer').Page} page
 * @returns {Promise<boolean>}
 */
async function isOnVerifyScreen(page) {
  try {
    const url = page.url() || "";
    if (/challenge\/verify\/email/i.test(url) || /#\/challenge\/verify\/email/i.test(url)) return true;
    return page
      .evaluate(() => (document.body?.innerText || "").includes("Verify your identity"))
      .catch(() => false);
  } catch (_) {
    return false;
  }
}

const OTP_SELECTORS = [
  'input[autocomplete="one-time-code"]',
  'input[name*="code"]',
  'input[id*="code"]',
  'input[placeholder*="ode"]',
  'input[type="text"][inputmode="numeric"]',
  'input[type="tel"]',
  'input[maxlength="1"]',
  'input[inputmode="numeric"]',
];

const MULTIPLE_OTP_SELECTORS = [
  'input[autocomplete="one-time-code"]',
  'input[inputmode="numeric"]',
  'input[maxlength="1"]',
  'input[type="tel"]',
  'input[type="text"][inputmode="numeric"]',
  'input[data-id*="code"], input[data-id*="otp"], input[aria-label*="code"]',
];

/**
 * Điền mã OTP vào ô (đơn hoặc nhiều ô) và submit.
 * @param {import('puppeteer').Page} page
 * @param {string} code - Mã OTP (số)
 * @returns {Promise<boolean>}
 */
async function fillOtpAndSubmit(page, code) {
  if (!code || typeof code !== "string") {
    console.log("[adobe OTP] fillOtpAndSubmit bỏ qua — code rỗng hoặc không hợp lệ.");
    return false;
  }
  const codeStr = String(code).replace(/\D/g, "").slice(0, 8);
  console.log("[adobe OTP] fillOtpAndSubmit bắt đầu — codeStr length=%s", codeStr.length);

  const countInputs = await page.evaluate((selectors) => {
    for (const sel of selectors) {
      try {
        const list = document.querySelectorAll(sel);
        if (list.length >= 4 && list.length <= 8) return list.length;
      } catch (_) {}
    }
    const allInputs = document.querySelectorAll(
      'input[type="text"], input[type="tel"], input:not([type])'
    );
    if (allInputs.length >= 4 && allInputs.length <= 8) return allInputs.length;
    return 0;
  }, MULTIPLE_OTP_SELECTORS);

  if (countInputs >= 4 && countInputs <= 8) {
    const digits = codeStr.slice(0, countInputs).split("");
    let inputs = await page.$$(
      'input[autocomplete="one-time-code"], input[inputmode="numeric"], input[maxlength="1"], input[type="tel"], input[type="text"][inputmode="numeric"]'
    );
    if (inputs.length < 4) inputs = await page.$$('input[type="text"], input[type="tel"]');
    inputs = inputs.slice(0, countInputs);
    if (inputs.length >= 4 && inputs.length <= 8) {
      for (let i = 0; i < digits.length && i < inputs.length; i++) {
        await inputs[i].click();
        await new Promise((r) => setTimeout(r, 80));
        await page.keyboard.type(digits[i], { delay: 50 });
        await new Promise((r) => setTimeout(r, 60));
      }
      await new Promise((r) => setTimeout(r, 500));
      const submitBtn = await page.$(
        '[data-id="Page-PrimaryButton"], button[data-variant="accent"], button[type="submit"]'
      );
      if (submitBtn) await submitBtn.evaluate((el) => el.click());
      console.log("[adobe OTP] fillOtpAndSubmit xong (nhiều ô).");
      return true;
    }
    const filled = await page.evaluate((selectors, digits) => {
      for (const sel of selectors) {
        try {
          const inpList = Array.from(document.querySelectorAll(sel));
          if (inpList.length >= 4 && inpList.length <= 8) {
            const arr = digits.split("").slice(0, inpList.length);
            inpList.forEach((inp, i) => {
              if (arr[i] != null) {
                inp.focus();
                inp.value = arr[i];
                inp.dispatchEvent(new Event("input", { bubbles: true }));
                inp.dispatchEvent(new Event("change", { bubbles: true }));
              }
            });
            return true;
          }
        } catch (_) {}
      }
      return false;
    }, MULTIPLE_OTP_SELECTORS, codeStr);
    if (filled) {
      await new Promise((r) => setTimeout(r, 500));
      const submitBtn = await page.$(
        '[data-id="Page-PrimaryButton"], button[data-variant="accent"]'
      );
      if (submitBtn) await submitBtn.evaluate((el) => el.click());
      console.log("[adobe OTP] fillOtpAndSubmit xong (page.evaluate).");
      return true;
    }
  }

  let inputEl = null;
  for (const sel of OTP_SELECTORS) {
    try {
      inputEl = await page.$(sel);
      if (inputEl) break;
    } catch (_) {}
  }
  if (!inputEl) {
    console.log("[adobe OTP] fillOtpAndSubmit: không tìm thấy ô OTP nào.");
    return false;
  }
  await inputEl.click();
  await new Promise((r) => setTimeout(r, 200));
  await page.keyboard.type(codeStr, { delay: 80 });
  await new Promise((r) => setTimeout(r, 300));
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 1500));
  const submitBtn = await page.$(
    '[data-id="Page-PrimaryButton"], button[data-variant="accent"]'
  );
  if (submitBtn) await submitBtn.evaluate((el) => el.click());
  console.log("[adobe OTP] fillOtpAndSubmit xong (ô đơn).");
  return true;
}

/**
 * Vòng lặp chờ mail OTP rồi gọi fillOtpAndSubmit. Thoát khi đã qua màn Verify.
 * @param {import('puppeteer').Page} page
 * @param {{ mailBackupId?: string|null }} options
 */
async function waitForOtpAndFill(page, options) {
  const mailBackupId = options.mailBackupId ?? null;
  const envOtp = !!(
    process.env.ADOBE_OTP_IMAP_HOST &&
    (process.env.ADOBE_OTP_IMAP_USER || process.env.MAILTEST) &&
    (process.env.ADOBE_OTP_IMAP_PASSWORD || process.env.APPPASSWORD)
  );
  const otpAutoEnabled = !!(mailBackupId || envOtp);
  console.log(
    "[adobe OTP] waitForOtpAndFill bắt đầu — mailBackupId=%s, envOtp=%s",
    mailBackupId,
    envOtp
  );
  if (!otpAutoEnabled) {
    console.log(
      "[adobe OTP] Không có cấu hình OTP (mail_backup_id hoặc ADOBE_OTP_IMAP_* / MAILTEST+APPPASSWORD) — sẽ chờ 2 phút cho user nhập tay."
    );
  }

  for (let t = 0; t < 60; t++) {
    await new Promise((r) => setTimeout(r, 2000));
    const url = page.url() || "";
    if (url.indexOf("@AdobeOrg") !== -1) {
      console.log("[adobe OTP] Đã qua Verify (URL có @AdobeOrg).");
      return;
    }
    const hasPw = await page
      .evaluate(() => !!document.querySelector('input[type="password"], input[name="password"]'))
      .catch(() => false);
    if (hasPw) {
      console.log("[adobe OTP] Đã qua Verify — hiện ô mật khẩu.");
      return;
    }
    const shouldFetch = otpAutoEnabled && (t <= 2 || t % 4 === 2);
    if (shouldFetch) {
      console.log(
        "[adobe OTP] Lần %s — gọi fetch OTP từ mail (mailBackupId=%s, envFallback=%s)...",
        t + 1,
        mailBackupId || "null",
        !mailBackupId
      );
      try {
        const code = mailBackupId
          ? await mailOtpService.fetchOtpFromEmail(mailBackupId, {
              useEnvFallback: false,
              senderFilter: "adobe",
              debugToConsole: true,
            })
          : await mailOtpService.fetchOtpFromEmail(null, {
              useEnvFallback: true,
              senderFilter: "adobe",
              debugToConsole: true,
            });
        if (code) {
          console.log(
            "[adobe OTP] Kết quả OTP: nhận được mã, length=%s — đang điền và Submit.",
            String(code).length
          );
          const ok = await fillOtpAndSubmit(page, code);
          console.log("[adobe OTP] fillOtpAndSubmit kết quả: ok=%s", ok);
          if (ok) await new Promise((r) => setTimeout(r, 5000));
        } else {
          console.log(
            "[adobe OTP] Kết quả OTP: null (chưa có mail hoặc không trích được mã). Sẽ thử lại sau."
          );
        }
      } catch (err) {
        console.log(
          "[adobe OTP] Lỗi khi lấy OTP:",
          err && err.message ? err.message : err
        );
      }
    }
  }

  const stillVerify = await isOnVerifyScreen(page);
  if (stillVerify) {
    throw new Error(
      "Hết thời gian chờ nhập OTP (2 phút). Vui lòng nhập mã từ email và thử lại."
    );
  }
}

module.exports = {
  isOnVerifyScreen,
  fillOtpAndSubmit,
  waitForOtpAndFill,
};
