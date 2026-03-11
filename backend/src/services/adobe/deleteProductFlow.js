/**
 * Flow xóa product khỏi user trên Admin Console.
 * Luồng: B-1 bấm link "Quản trị viên" (từ trang /users) → chờ vào /users/administrators → B0–B4.
 * Gọi khi page đang ở trang /users (không goto trực tiếp /users/administrators).
 */

const logger = require("../../utils/logger");
const { ADMIN_CONSOLE_USERS_ADMINISTRATORS_URL } = require("./constants");

const SLEEP_MS = 800;
const SLEEP_AFTER_OPEN = 1200;
const SLEEP_AFTER_EDIT = 1200;
const WAIT_SELECTOR_MS = 20000;
const POLL_MS = 200;
const SLEEP_AFTER_ADMIN_LINK = 1200;

function sleep(ms = SLEEP_MS) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Chờ đến khi fn() trong page trả về truthy (dùng page.evaluate), tối đa timeout ms.
 * @param {import('puppeteer').Page} page
 * @param {() => Promise<boolean>} fn - async function chạy trong page (selector tồn tại, v.v.)
 * @param {number} timeout
 * @returns {Promise<boolean>}
 */
async function waitUntil(page, fn, timeout = WAIT_SELECTOR_MS) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ok = await fn();
    if (ok) return true;
    await sleep(POLL_MS);
  }
  return false;
}

/**
 * B-1: Từ trang /users, bấm link "Quản trị viên" để vào /users/administrators, chờ trang load.
 * @param {import('puppeteer').Page} page - Đang ở trang adminconsole.adobe.com/users
 */
async function clickAdministratorsLinkAndWait(page) {
  const clicked = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/users/administrators"]');
    if (!link || link.offsetParent === null) return false;
    link.scrollIntoView({ block: "center" });
    link.click();
    return true;
  });
  if (!clicked) {
    throw new Error("Không tìm thấy link Quản trị viên (a[href*=\"/users/administrators\"])");
  }
  logger.info("[adobe] deleteProduct: đã bấm Quản trị viên");
  await sleep(SLEEP_AFTER_ADMIN_LINK);

  const onAdministrators = await waitUntil(
    page,
    async () => {
      return await page.evaluate(() => {
        const path = (window.location && window.location.pathname) || "";
        const body = (document.body && document.body.innerText) || "";
        return path.includes("/users/administrators") || body.includes("Quản trị viên");
      });
    },
    20000
  );
  if (!onAdministrators) {
    logger.warn("[adobe] deleteProduct: chờ vào trang administrators timeout");
  }
  await sleep(1200);
}

/**
 * B0: Bấm nút "Xem chi tiết" (user detail). Nếu userEmail cho trước thì tìm row chứa email đó rồi bấm trong row; không thì bấm nút đầu tiên.
 * @param {import('puppeteer').Page} page
 * @param {string} [userEmail] - Email user cần mở (tùy chọn). Nếu không truyền thì chọn user đầu tiên.
 */
async function clickOpenUserDetail(page, userEmail) {
  const clicked = await page.evaluate((email) => {
    const norm = (s) => (s || "").trim().toLowerCase();
    const targetEmail = email ? norm(email) : null;
    const buttons = [...document.querySelectorAll('button[aria-label^="Xem chi tiết"], button[aria-label^="View details"]')].filter(
      (b) => b.offsetParent !== null
    );
    if (targetEmail) {
      for (const btn of buttons) {
        const row = btn.closest('div[role="row"]');
        if (!row) continue;
        const rowText = norm(row.innerText || row.textContent || "");
        if (rowText.includes(targetEmail)) {
          btn.scrollIntoView({ block: "center" });
          btn.click();
          return true;
        }
      }
    }
    if (buttons.length > 0) {
      buttons[0].scrollIntoView({ block: "center" });
      buttons[0].click();
      return true;
    }
    return false;
  }, userEmail || null);
  if (!clicked) {
    throw new Error("Không tìm thấy nút Xem chi tiết / View details");
  }
  logger.info("[adobe] deleteProduct: đã bấm Xem chi tiết", userEmail ? { userEmail } : {});
  await sleep(SLEEP_AFTER_OPEN);
}

/**
 * B1: Bấm menu "More actions" (3 chấm).
 */
async function clickMoreActions(page) {
  const ok = await waitUntil(page, async () => {
    return await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="More actions"]');
      if (!btn || btn.offsetParent === null) return false;
      btn.scrollIntoView({ block: "center" });
      btn.click();
      return true;
    });
  });
  if (!ok) throw new Error("Không tìm thấy nút More actions");
  logger.info("[adobe] deleteProduct: đã bấm More actions");
  await sleep(SLEEP_MS);
}

/**
 * B2: Bấm "Chỉnh sửa sản phẩm" (Edit products and groups).
 */
async function clickEditProducts(page) {
  const ok = await waitUntil(page, async () => {
    return await page.evaluate(() => {
      const el = document.querySelector('[data-key="EDIT_PRODUCTS_AND_GROUPS"]');
      if (!el || el.offsetParent === null) return false;
      el.scrollIntoView({ block: "center" });
      el.click();
      return true;
    });
  });
  if (!ok) throw new Error("Không tìm thấy EDIT_PRODUCTS_AND_GROUPS");
  logger.info("[adobe] deleteProduct: đã bấm Chỉnh sửa sản phẩm");
  await sleep(SLEEP_AFTER_EDIT);
}

/**
 * B3: Bấm nút xóa product (mini-product-card-close-button).
 */
async function clickRemoveProduct(page) {
  const ok = await waitUntil(page, async () => {
    return await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="mini-product-card-close-button"]');
      if (!btn || btn.offsetParent === null) return false;
      btn.scrollIntoView({ block: "center" });
      btn.click();
      return true;
    });
  });
  if (!ok) {
    logger.warn("[adobe] deleteProduct: không tìm thấy nút xóa product (có thể user không có product)");
    return false;
  }
  logger.info("[adobe] deleteProduct: đã bấm xóa product");
  await sleep(SLEEP_MS);
  return true;
}

/**
 * B4: Bấm Save (cta-button, không disabled).
 */
async function clickSave(page) {
  const ok = await waitUntil(page, async () => {
    return await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="cta-button"]');
      if (!btn || btn.disabled || btn.offsetParent === null) return false;
      btn.scrollIntoView({ block: "center" });
      btn.click();
      return true;
    });
  });
  if (!ok) throw new Error("Không tìm thấy nút Save (cta-button) hoặc nút đang disabled");
  logger.info("[adobe] deleteProduct: đã bấm Save");
  await sleep(SLEEP_MS);
}

/**
 * Chạy toàn bộ flow xóa product. Page phải đang ở trang /users (sau khi scrape users).
 * B-1: bấm link "Quản trị viên" → chờ vào /users/administrators → B0–B4.
 *
 * @param {import('puppeteer').Page} page - Đã đăng nhập, đang ở trang adminconsole.adobe.com/users
 * @param {{ userEmail?: string }} [opts]
 * - userEmail: email user cần xóa product (nếu không truyền thì chọn user đầu tiên)
 */
async function runDeleteProduct(page, opts = {}) {
  const { userEmail } = opts;
  const currentUrl = (page.url() || "").trim();
  const alreadyOnAdministrators =
    currentUrl.indexOf("/users/administrators") !== -1 || currentUrl.includes(ADMIN_CONSOLE_USERS_ADMINISTRATORS_URL);

  if (!alreadyOnAdministrators) {
    try {
      await clickAdministratorsLinkAndWait(page);
    } catch (e) {
      logger.warn("[adobe] deleteProduct: B-1 lỗi (bỏ qua): %s", e.message);
      return { removed: false, skipped: true };
    }
    const urlNow = (page.url() || "").trim();
    if (urlNow.indexOf("/users/administrators") === -1 && !urlNow.includes(ADMIN_CONSOLE_USERS_ADMINISTRATORS_URL)) {
      logger.warn("[adobe] deleteProduct: sau B-1 vẫn chưa vào administrators, bỏ qua");
      return { removed: false, skipped: true };
    }
  }

  await sleep(1200);
  try {
    await page.waitForSelector(
      'button[aria-label^="Xem chi tiết"], button[aria-label^="View details"]',
      { visible: true, timeout: 15000 }
    );
    await sleep(1000);
  } catch (e) {
    logger.warn("[adobe] deleteProduct: chờ nút Xem chi tiết: %s", e.message);
  }

  await clickOpenUserDetail(page, userEmail);
  await clickMoreActions(page);
  await clickEditProducts(page);

  // B3: nếu không có product nào để xóa → bỏ qua Save
  const removed = await clickRemoveProduct(page);
  if (!removed) {
    logger.info("[adobe] deleteProduct: không có product gán cho user → bỏ qua");
    return { removed: false, skipped: true };
  }

  await clickSave(page);
  return { removed };
}

module.exports = {
  runDeleteProduct,
  clickAdministratorsLinkAndWait,
  clickOpenUserDetail,
  clickMoreActions,
  clickEditProducts,
  clickRemoveProduct,
  clickSave,
};
