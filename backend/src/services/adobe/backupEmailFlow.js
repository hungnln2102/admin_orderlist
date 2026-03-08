/**
 * Xử lý màn "Add a backup email address" (auth.services.adobe.com #/progressive-profile/add-secondary-email/):
 * chỉ nhận diện để bấm Not now / Skip. Bỏ qua màn "verify phone number" (bấm Not now / Skip).
 */

const logger = require("../../utils/logger");

const ADD_SECONDARY_EMAIL_HASH = "add-secondary-email";
const WAIT_MS = 800;

function wait(ms = WAIT_MS) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Đang ở màn Add a backup email address (Secondary email).
 * @param {import('puppeteer').Page} page
 * @returns {Promise<boolean>}
 */
async function isOnAddBackupEmailScreen(page) {
  try {
    const url = (await page.url()) || "";
    if (url.includes(ADD_SECONDARY_EMAIL_HASH)) return true;
    return await page
      .evaluate(() => {
        const t = (document.body && document.body.innerText) || "";
        return (
          /Add a backup email address/i.test(t) ||
          /Secondary email address/i.test(t) ||
          /Thêm địa chỉ email dự phòng/i.test(t)
        );
      })
      .catch(() => false);
  } catch (_) {
    return false;
  }
}

/**
 * Đang ở màn yêu cầu verify phone / thêm số điện thoại.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<boolean>}
 */
async function isOnVerifyPhoneScreen(page) {
  try {
    return await page
      .evaluate(() => {
        const t = (document.body && document.body.innerText) || "";
        const url = (window.location && window.location.href) || "";
        return (
          (/phone|số điện thoại|telephone|mobile number/i.test(t) &&
            /verify|add|thêm|xác minh|nhập/i.test(t)) ||
          /progressive-profile.*phone|add-phone|verify-phone/i.test(url)
        );
      })
      .catch(() => false);
  } catch (_) {
    return false;
  }
}

/**
 * Bấm Not now / Skip để bỏ qua verify phone.
 * @param {import('puppeteer').Page} page
 * @param {Function} clickButtonByText - từ loginHelpers
 * @returns {Promise<boolean>}
 */
async function skipVerifyPhone(page, clickButtonByText) {
  logger.info("[adobe] Gặp màn verify phone — bấm Not now / Skip.");
  const skipLabels = [
    /^\s*not now\s*$/i,
    /^\s*skip\s*$/i,
    /^\s*bỏ qua\s*$/i,
    /^\s*later\s*$/i,
    /^\s*skip for now\s*$/i,
  ];
  for (const re of skipLabels) {
    const ok = await clickButtonByText(page, re, 8000);
    if (ok) {
      await wait(1500);
      return true;
    }
  }
  logger.warn("[adobe] Không tìm thấy nút Skip/Not now cho verify phone.");
  return false;
}

module.exports = {
  isOnAddBackupEmailScreen,
  isOnVerifyPhoneScreen,
  skipVerifyPhone,
};
