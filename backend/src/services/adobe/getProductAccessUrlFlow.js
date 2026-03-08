/**
 * Luồng lấy URL truy cập sản phẩm trên trang Auto-assign (adminconsole.adobe.com/products/auto-assign).
 * Add product → dropdown → chọn sản phẩm → Tiếp tục (bước 2) → Tiếp tục (bước 3) → Lưu → đọc URL từ form.
 * Chỉ chạy khi tài khoản có gói và cột url_access trống (gọi từ runAdminConsoleFlow).
 */

const logger = require("../../utils/logger");

const STEP_DELAY_MS = 800;
const WAIT_AFTER_STEP_MS = 2000;

function wait(ms = STEP_DELAY_MS) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Selector nút Tiếp tục / Next trong modal Add automatic assignment rule */
const CTA_BUTTON_SELECTOR = 'button[data-testid="cta-button"]';

/**
 * Chờ và bấm nút CTA (Tiếp tục / Next) trong modal — dùng data-testid="cta-button".
 * @param {import('puppeteer').Page} page
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function waitAndClickCtaButton(page, timeoutMs = 15000) {
  try {
    await page.waitForSelector(CTA_BUTTON_SELECTOR, { visible: true, timeout: timeoutMs });
    await wait(400);
    const clicked = await page.evaluate((sel) => {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    }, CTA_BUTTON_SELECTOR);
    return !!clicked;
  } catch (e) {
    return false;
  }
}

/**
 * Chờ nút có text xuất hiện (visible, không disabled) rồi click. Thử nhiều lần trong timeoutMs.
 * @param {import('puppeteer').Page} page
 * @param {string[]} labels - Các text có thể (vd. ["Lưu", "Save"])
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function waitAndClickButton(page, labels, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const clicked = await page.evaluate((lbls) => {
      const norm = (s) => (s || "").trim();
      for (const btn of document.querySelectorAll("button, [role='button']")) {
        if (btn.offsetParent === null || btn.disabled) continue;
        const t = norm(btn.innerText || btn.textContent);
        if (lbls.some((l) => t === l || t.includes(l))) {
          btn.click();
          return true;
        }
      }
      return false;
    }, labels);
    if (clicked) return true;
    await wait(600);
  }
  return false;
}

/**
 * Trên trang auto-assign: bấm Add product → dropdown → chọn option đầu → Tiếp tục x2 → Lưu → đọc URL từ popup.
 * @param {import('puppeteer').Page} page - Đã ở trang adminconsole.adobe.com/products/auto-assign
 * @returns {Promise<string|null>} URL truy cập sản phẩm (acrs.adobe.com/...) hoặc null nếu lỗi
 */
async function getProductAccessUrl(page) {
  logger.info("[adobe] getProductAccessUrl: bắt đầu trên trang auto-assign");

  const currentUrl = await page.url();
  if (!currentUrl || !currentUrl.includes("/products/auto-assign")) {
    logger.warn("[adobe] getProductAccessUrl: không ở trang auto-assign, bỏ qua. URL: %s", currentUrl || "(empty)");
    return null;
  }

  try {
    await page.waitForSelector('button[data-variant="accent"]', { visible: true, timeout: 15000 });
  } catch (e) {
    logger.warn("[adobe] getProductAccessUrl: không thấy nút Add product sau 15s: %s", e.message);
    return null;
  }
  await wait(1000);

  // 1. Click Add product
  const addClicked = await page.evaluate(() => {
    const addBtn = document.querySelector('button[data-variant="accent"]');
    if (addBtn) {
      addBtn.click();
      return true;
    }
    return false;
  });
  if (!addClicked) {
    logger.warn("[adobe] getProductAccessUrl: không tìm thấy nút Add product");
    return null;
  }
  await wait(STEP_DELAY_MS);

  // 2. Open dropdown suggestions
  const dropdownClicked = await page.evaluate(() => {
    const dropdownBtn = document.querySelector('button[aria-label="Show suggestions"]');
    if (dropdownBtn) {
      dropdownBtn.click();
      return true;
    }
    return false;
  });
  if (!dropdownClicked) {
    logger.warn("[adobe] getProductAccessUrl: không tìm thấy nút dropdown suggestions");
    return null;
  }
  await wait(500);

  // 3. Chọn sản phẩm (option đầu tiên, vd. Creative Cloud Pro)
  const optionClicked = await page.evaluate(() => {
    const options = [...document.querySelectorAll('[role="option"]')].filter((el) => el.offsetParent !== null);
    const option = options[0];
    if (option) {
      option.click();
      return true;
    }
    return false;
  });
  if (!optionClicked) {
    logger.warn("[adobe] getProductAccessUrl: không tìm thấy option nào");
    return null;
  }
  await wait(WAIT_AFTER_STEP_MS);

  // 4. Bước 2: Bấm "Tiếp tục" / "Next" (nút CTA trong modal)
  let ok = await waitAndClickCtaButton(page, 15000);
  if (!ok) {
    logger.warn("[adobe] getProductAccessUrl: không tìm thấy nút Tiếp tục (bước 2, data-testid=cta-button)");
    return null;
  }
  await wait(WAIT_AFTER_STEP_MS);

  // 5. Bước 3: Bấm "Tiếp tục" / "Next" lần 2
  ok = await waitAndClickCtaButton(page, 15000);
  if (!ok) {
    logger.warn("[adobe] getProductAccessUrl: không tìm thấy nút Tiếp tục (bước 3, data-testid=cta-button)");
    return null;
  }
  await wait(WAIT_AFTER_STEP_MS);

  // 6. Bấm "Lưu" / "Save" để hiện form URL (nút CTA có thể là "Save" ở bước cuối, thử CTA trước)
  ok = await waitAndClickCtaButton(page, 15000);
  if (!ok) {
    const saveLabels = ["Lưu", "Save"];
    ok = await waitAndClickButton(page, saveLabels, 10000);
  }
  if (!ok) {
    logger.warn("[adobe] getProductAccessUrl: không tìm thấy nút Lưu");
    return null;
  }
  await wait(2000);

  // 7. Đợi popup có URL (input chứa acrs.adobe.com), đọc value
  for (let i = 0; i < 15; i++) {
    await wait(800);
    const url = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"], input:not([type="password"])');
      for (const input of inputs) {
        const val = (input.value || "").trim();
        if (val && (val.includes("acrs.adobe.com") || val.includes("adobe.com/go/"))) {
          return val;
        }
      }
      // Fallback: bất kỳ text field nào có URL dạng https://...
      const all = document.querySelectorAll('input, [contenteditable="true"]');
      for (const el of all) {
        const val = (el.value != null ? el.value : el.innerText || "").trim();
        if (val.startsWith("https://") && val.includes("adobe.com")) return val;
      }
      return null;
    });
    if (url) {
      logger.info("[adobe] getProductAccessUrl: đã lấy URL từ popup");
      // Đóng popup (nút Đóng / Close) nếu có
      await page.evaluate(() => {
        const labels = ["Đóng", "Close"];
        const norm = (s) => (s || "").trim();
        for (const btn of document.querySelectorAll("button, [role='button']")) {
          const t = norm(btn.innerText || btn.textContent);
          if (labels.some((l) => t === l || t.includes(l))) {
            btn.click();
            return;
          }
        }
      });
      return url;
    }
  }

  logger.warn("[adobe] getProductAccessUrl: không thấy popup URL sau khi chờ");
  return null;
}

module.exports = {
  getProductAccessUrl,
};
