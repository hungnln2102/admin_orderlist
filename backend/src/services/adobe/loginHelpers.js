/**
 * Helper đăng nhập Adobe: bấm nút theo text, skip security, đợi ô mật khẩu, điền bằng keyboard.
 */

const logger = require("../../utils/logger");

const PASSWORD_SELECTORS = [
  'input[name="password"]',
  'input[type="password"]',
  'input#password',
  'input[data-testid="password-field"]',
  '[name="password"]',
];

/**
 * Bấm nút (button/role=button/a/input submit) có label khớp regex, kể cả trong shadow root.
 * @param {import('puppeteer').Page} page
 * @param {RegExp} re
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function clickButtonByText(page, re, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const clicked = await page.evaluate((reSource, reFlags) => {
        const re = new RegExp(reSource, reFlags);
        const isVisible = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect?.();
          const hasRect = rect && rect.width > 2 && rect.height > 2;
          return el.offsetParent !== null || hasRect;
        };
        const getLabel = (el) => {
          const t = (el.textContent || "").trim();
          if (t) return t;
          const aria = (el.getAttribute && el.getAttribute("aria-label")) || "";
          return String(aria || "").trim();
        };
        const candidates = [];
        const visitRoot = (root) => {
          if (!root) return;
          const nodes = root.querySelectorAll
            ? root.querySelectorAll(
                "button, [role='button'], a, input[type='submit'], input[type='button']"
              )
            : [];
          nodes.forEach((n) => candidates.push(n));
          const all = root.querySelectorAll ? root.querySelectorAll("*") : [];
          all.forEach((el) => {
            if (el && el.shadowRoot) visitRoot(el.shadowRoot);
          });
        };
        visitRoot(document);
        const el = candidates.find((c) => isVisible(c) && re.test(getLabel(c)));
        if (!el) return false;
        el.click();
        return true;
      }, re.source, re.flags);
      if (clicked) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Nếu đang ở trang user-security (thêm SĐT/email dự phòng), bấm Skip.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<boolean>}
 */
async function maybeSkipSecurityPrompt(page) {
  const url = page.url() || "";
  if (!/progressive-profile\/user-security|user-security/i.test(url)) return false;
  logger.info("[adobe] Gặp màn hình yêu cầu thêm SĐT/email dự phòng, thử bấm Skip ...");
  const ok = await clickButtonByText(page, /^\s*skip\s*$/i, 20000);
  if (!ok) {
    logger.warn("[adobe] Không tìm thấy nút Skip (có thể UI thay đổi). URL: %s", url);
    return false;
  }
  await Promise.race([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }),
    new Promise((r) => setTimeout(r, 5000)),
  ]).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  logger.info("[adobe] Đã bấm Skip, URL hiện tại: %s", page.url());
  return true;
}

/**
 * Chờ ô mật khẩu xuất hiện (thử lần lượt PASSWORD_SELECTORS).
 * @param {import('puppeteer').Page} page
 * @returns {Promise<import('puppeteer').ElementHandle>}
 */
async function waitForPassword(page) {
  for (const sel of PASSWORD_SELECTORS) {
    try {
      const el = await page.waitForSelector(sel, { timeout: 8000 });
      if (el) return el;
    } catch (_) {
      continue;
    }
  }
  throw new Error(
    "Không tìm thấy ô mật khẩu trên trang (có thể trang đổi giao diện hoặc yêu cầu 2FA)."
  );
}

/**
 * Điền text bằng keyboard (form Adobe chỉ nhận input thật).
 * @param {import('puppeteer').Page} page
 * @param {import('puppeteer').ElementHandle} elementHandle
 * @param {string} text
 * @param {number} delayMs
 */
async function fillWithKeyboard(page, elementHandle, text, delayMs = 25) {
  if (!text || !elementHandle) return;
  await elementHandle.click();
  await new Promise((r) => setTimeout(r, 100));
  await page.keyboard.type(String(text), { delay: delayMs });
}

/**
 * Thử bấm nút Continue (Page-PrimaryButton, accent, hoặc text Continue/Tiếp tục), kể cả trong frame/shadow.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<boolean>}
 */
async function tryClickContinue(page) {
  try {
    const btn = await page.waitForSelector('[data-id="Page-PrimaryButton"]', {
      visible: true,
      timeout: 6000,
    });
    if (btn) {
      await btn.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await new Promise((r) => setTimeout(r, 300));
      await btn.evaluate((el) => el.click());
      return true;
    }
  } catch (_) {}
  try {
    const btn = await page.$('button[data-variant="accent"]');
    if (btn) {
      const text = await btn.evaluate((el) => (el.textContent || "").trim());
      if (/\b(continue|tiếp\s*tục)\b/i.test(text)) {
        await btn.evaluate((el) => el.click());
        return true;
      }
    }
  } catch (_) {}
  try {
    for (const frame of page.frames()) {
      const clicked = await frame
        .evaluate(() => {
          const re = /\b(continue|tiếp\s*tục)\b/i;
          const nodes = document.querySelectorAll(
            "button, [role='button'], a, input[type='submit']"
          );
          for (const el of nodes) {
            const text = (el.textContent || el.getAttribute("aria-label") || "").trim();
            if (re.test(text)) {
              const rect = el.getBoundingClientRect?.();
              if (rect && rect.width > 2 && rect.height > 2) {
                el.scrollIntoView({ block: "center" });
                el.click();
                return true;
              }
            }
          }
          return false;
        })
        .catch(() => false);
      if (clicked) return true;
    }
  } catch (_) {}
  const clickedInShadow = await page
    .evaluate(() => {
      const re = /\b(continue|tiếp\s*tục)\b/i;
      function findAndClick(root) {
        if (!root) return false;
        const buttons =
          root.querySelectorAll &&
          root.querySelectorAll(
            "button, [role='button'], [data-id='Page-PrimaryButton']"
          );
        if (buttons)
          for (const el of buttons) {
            const text = (el.textContent || el.getAttribute("aria-label") || "").trim();
            if (
              re.test(text) ||
              el.getAttribute("data-id") === "Page-PrimaryButton"
            ) {
              const rect = el.getBoundingClientRect && el.getBoundingClientRect();
              if (rect && rect.width > 2 && rect.height > 2) {
                el.scrollIntoView({ block: "center" });
                el.click();
                return true;
              }
            }
          }
        const all = root.querySelectorAll && root.querySelectorAll("*");
        if (all) for (const el of all) {
          if (el.shadowRoot && findAndClick(el.shadowRoot)) return true;
        }
        return false;
      }
      return findAndClick(document.body);
    })
    .catch(() => false);
  if (clickedInShadow) return true;
  return await clickButtonByText(page, /\b(continue|tiếp\s*tục)\b/i, 10000);
}

module.exports = {
  clickButtonByText,
  maybeSkipSecurityPrompt,
  waitForPassword,
  fillWithKeyboard,
  tryClickContinue,
};
