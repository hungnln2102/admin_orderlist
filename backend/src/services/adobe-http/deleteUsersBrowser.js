/**
 * Playwright: xóa user trên Adobe Admin Console qua giao diện web.
 *
 * LUỒNG (đơn giản, 1 browser):
 * 1. Login (cookie nếu còn, không thì form email/password)
 * 2. Vào thẳng .../orgId@AdobeOrg/users
 * 3. Chọn user theo email (checkbox) → bấm "Xóa người dùng"
 * 4. Nếu có modal "Hành động cần thiết..." → bấm "Tiếp tục"
 * 5. Modal "Xóa người dùng": chọn "Xóa vĩnh viễn nội dung" (B4) → "Tiếp theo" (B5)
 * 6. Modal confirm: bấm "Xóa người dùng" (B6)
 *
 * Env (tránh timeout lâu khi trang có banner/request liên tục):
 * - ADOBE_DELETE_NAV_TIMEOUT: ms cho goto (mặc định 90000).
 * - ADOBE_DELETE_WAIT_UNTIL: "domcontentloaded" | "load" | "networkidle" (mặc định domcontentloaded).
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
const { getPlaywrightProxyOptions } = require("./proxyConfig");
const {
  toPwCookies,
  fromPwCookies,
  detectScreen,
  enterPassword,
  handle2FA,
  maybeSkipSecurityPrompt,
  handleProgressiveProfile,
} = require("./loginBrowser");

const ADOBE_ENTRY_URL = "https://adminconsole.adobe.com/";
const USERS_URL = "https://adminconsole.adobe.com/users";

const NAV_TIMEOUT = Number(process.env.ADOBE_DELETE_NAV_TIMEOUT) || 90000;
const WAIT_UNTIL = process.env.ADOBE_DELETE_WAIT_UNTIL || "domcontentloaded";

async function doFormLogin(page, email, password, mailBackupId) {
  try {
    await page.waitForURL(/auth\.services\.adobe\.com|adobelogin\.com/, { timeout: 30000 }).catch(() => {});
    const emailInput = page.locator('input[name="username"], input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 45000 });
    await emailInput.click();
    await page.keyboard.type(email, { delay: 25 });
    await page.waitForTimeout(150);
    await page.keyboard.press("Enter");

    const afterEmail = await detectScreen(page, 15000);
    if (afterEmail === "2fa") {
      await handle2FA(page, mailBackupId);
      const after2fa = await detectScreen(page, 10000);
      if (after2fa === "password") await enterPassword(page, password);
    } else if (afterEmail === "password") {
      await enterPassword(page, password);
      const afterPw = await detectScreen(page, 10000);
      if (afterPw === "2fa") await handle2FA(page, mailBackupId);
    }

    await maybeSkipSecurityPrompt(page);
    await handleProgressiveProfile(page, mailBackupId);

    await page.waitForFunction(
      () => {
        const h = window.location.href;
        return h.includes("@AdobeOrg") || (h.includes("adminconsole.adobe.com") && !h.includes("auth.services"));
      },
      { timeout: 90000 }
    ).catch(() => {});
    await page.waitForTimeout(2500);
    const ok = page.url().includes("adminconsole.adobe.com") || page.url().includes("@AdobeOrg");
    logger.info("[delete-users-pw] Form login %s", ok ? "OK" : "FAIL");
    return ok;
  } catch (e) {
    logger.error("[delete-users-pw] doFormLogin: %s", e.message);
    return false;
  }
}

/**
 * Chọn checkbox của user theo email trong bảng.
 * Admin Console có thể dùng table tr hoặc [role="row"], checkbox có thể input hoặc [role="checkbox"].
 */
async function selectUserByEmail(page, email) {
  const emailNorm = (email || "").trim().toLowerCase();
  if (!emailNorm) return false;

  const emailRe = new RegExp(escapeRegex(emailNorm), "i");
  const rowSelectors = [
    '[role="row"]',
    "tbody tr",
    "table tr",
    '[class*="row"]',
  ];
  let row = null;
  for (const sel of rowSelectors) {
    const matching = page.locator(sel).filter({ hasText: emailRe });
    const count = await matching.count().catch(() => 0);
    if (count > 0) {
      const first = matching.first();
      const vis = await first.isVisible({ timeout: 2000 }).catch(() => false);
      if (vis) {
        row = first;
        break;
      }
    }
  }
  if (!row) {
    logger.debug("[delete-users-pw] Không tìm thấy row chứa email: %s", emailNorm);
    return false;
  }

  const checkboxSelectors = [
    'input[type="checkbox"]',
    '[role="checkbox"]',
    'td input[type="checkbox"]',
    '[class*="checkbox"] input',
  ];
  for (const sel of checkboxSelectors) {
    const cb = row.locator(sel).first();
    try {
      const visible = await cb.isVisible({ timeout: 1500 }).catch(() => false);
      if (!visible) continue;
      const checked = await cb.isChecked().catch(() => false);
      if (!checked) {
        await cb.click({ force: true });
      }
      logger.info("[delete-users-pw] Đã chọn user: %s", emailNorm);
      return true;
    } catch (_) {
      continue;
    }
  }
  logger.warn("[delete-users-pw] Tìm thấy row nhưng không có checkbox cho: %s", emailNorm);
  return false;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Click nút "Xóa người dùng" / "Remove users" trên toolbar (sau khi đã chọn user).
 * Doc: data-testid="remove-member-btn" (Renew_Adobe_Check_Flow.md B2).
 */
async function clickDeleteUserButton(page) {
  const byTestId = page.locator('[data-testid="remove-member-btn"]').first();
  if (await byTestId.isVisible({ timeout: 2000 }).catch(() => false)) {
    try {
      await byTestId.click({ timeout: 5000 });
      return true;
    } catch (_) {}
  }
  const btn = page.getByRole("button", { name: /xóa người dùng|delete user|remove user/i });
  try {
    await btn.first().click({ timeout: 5000 });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Nếu modal "Hành động cần thiết trước khi xóa người dùng" (nhiều user) → bấm "Tiếp tục" trước.
 * Doc: sau đó chọn theo B4 (Xóa vĩnh viễn nội dung) bên trên.
 */
async function maybeClickContinueInModal(page) {
  const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
  if (!(await dialog.isVisible({ timeout: 5000 }).catch(() => false))) return false;
  const continueBtn = dialog.getByRole("button", { name: /tiếp tục|continue/i });
  if (await continueBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await continueBtn.first().click({ timeout: 8000 });
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

/** Timeout cho modal xóa (B4/B5): modal có thể load chậm. */
const MODAL_OPTIONS_TIMEOUT = 15000;

/**
 * Modal 1: Chọn "Xóa vĩnh viễn nội dung" (B4) và bấm "Tiếp theo" (B5).
 * Doc: radio value="DELETE" hoặc label "Xóa vĩnh viễn nội dung" / "Permanently delete content".
 */
async function handleDeleteModalOptions(page) {
  try {
    const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
    await dialog.waitFor({ state: "visible", timeout: MODAL_OPTIONS_TIMEOUT }).catch(() => {});

    let radioClicked = false;
    const strategies = [
      () => dialog.getByRole("radio", { name: /xóa vĩnh viễn nội dung|permanently delete content/i }).first(),
      () => page.locator('input[type="radio"][value="DELETE"]').first(),
      () => dialog.locator("label").filter({ hasText: /xóa vĩnh viễn|permanently delete/i }).first(),
    ];
    for (const getLocator of strategies) {
      try {
        const el = getLocator();
        await el.click({ timeout: 8000 });
        radioClicked = true;
        break;
      } catch (_) {
        continue;
      }
    }
    if (!radioClicked) {
      logger.warn("[delete-users-pw] handleDeleteModalOptions: không tìm thấy radio Xóa vĩnh viễn nội dung");
      return false;
    }
    await page.waitForTimeout(500);

    const nextBtn = page.getByRole("button", { name: /tiếp theo|next/i }).first();
    await nextBtn.click({ timeout: 8000 });
    await page.waitForTimeout(1500);
    return true;
  } catch (e) {
    logger.warn("[delete-users-pw] handleDeleteModalOptions: %s", e.message);
    return false;
  }
}

/**
 * Modal 2 (B6) + popup đơn giản: Bấm "Xóa người dùng" / "Remove users" để confirm.
 * Không phụ thuộc nhiều vào cấu trúc dialog, chỉ dựa vào text + variant=negative.
 */
async function confirmDeleteUsers(page) {
  try {
    const candidates = [
      () => page.getByRole("button", { name: /xóa người dùng|remove users?|delete users?/i }).first(),
      () => page.locator('[data-testid="cta-button"][data-variant="negative"]').first(),
    ];

    for (const getLocator of candidates) {
      try {
        const btn = getLocator();
        const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
        if (!visible) continue;
        await btn.click({ timeout: 5000 });
        await page.waitForTimeout(1500);
        return true;
      } catch (_) {
        continue;
      }
    }

    logger.warn("[delete-users-pw] confirmDeleteUsers: không tìm thấy nút confirm");
    return false;
  } catch (e) {
    logger.warn("[delete-users-pw] confirmDeleteUsers: %s", e.message);
    return false;
  }
}

/**
 * Xóa users qua giao diện Admin Console (Playwright).
 *
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @param {string[]} userEmails - Danh sách email cần xóa
 * @param {object} options - { savedCookies, mailBackupId }
 * @returns {{ deleted: string[], failed: string[], savedCookies: object[]|null }}
 */
async function deleteUsersViaBrowser(email, password, userEmails, options = {}) {
  const savedCookies = options.savedCookies || [];
  const mailBackupId = options.mailBackupId || null;
  const userList = Array.isArray(userEmails) ? userEmails.filter((e) => (e || "").trim()) : [];
  const deleted = [];
  const failed = [];

  if (userList.length === 0) {
    return { deleted: [], failed: [], savedCookies: null };
  }

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const proxyOptions = getPlaywrightProxyOptions();
  logger.info("[delete-users-pw] Khởi động Playwright (headless=%s), xóa %d users...", headless, userList.length);

  const launchOptions = {
    headless,
    slowMo: headless ? 0 : 60,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  };
  if (proxyOptions) launchOptions.proxy = proxyOptions;
  const browser = await chromium.launch(launchOptions);

  let freshCookies = null;

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });

    const pwCookies = toPwCookies(savedCookies);
    if (pwCookies.length > 0) {
      await context.addCookies(pwCookies);
      logger.info("[delete-users-pw] Import %d cookies", pwCookies.length);
    }

    const page = await context.newPage();

    // B1: Login (domcontentloaded tránh timeout lâu khi trang có banner/request liên tục)
    await page.goto(ADOBE_ENTRY_URL, { waitUntil: WAIT_UNTIL, timeout: NAV_TIMEOUT }).catch(() => {});
    await page.waitForTimeout(3000);

    let currentUrl = page.url();
    if (currentUrl.includes("auth.services") || currentUrl.includes("adobelogin.com")) {
      logger.info("[delete-users-pw] Cookies hết hạn → form login");
      const ok = await doFormLogin(page, email, password, mailBackupId);
      if (!ok) {
        logger.warn("[delete-users-pw] Form login thất bại");
        freshCookies = fromPwCookies(await context.cookies());
        return { deleted: [], failed: userList, savedCookies: freshCookies };
      }
      currentUrl = page.url();
    }

    // Login xong (cookie/form) thường ở overview — chờ @AdobeOrg rồi vào thẳng ../users
    if (!currentUrl.includes("@AdobeOrg")) {
      await page.waitForURL(/@AdobeOrg/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      currentUrl = page.url();
    }
    const orgMatch = currentUrl.match(/^(https:\/\/adminconsole\.adobe\.com\/[^/]+@AdobeOrg)/);
    const usersUrl = orgMatch ? `${orgMatch[1]}/users` : USERS_URL;

    // Vào thẳng trang Users (nếu vẫn ở overview thì bấm link "Users" / "Người dùng")
    await page.goto(usersUrl, { waitUntil: WAIT_UNTIL, timeout: NAV_TIMEOUT }).catch(() => {});
    await page.waitForTimeout(4000);
    currentUrl = page.url();
    if (!currentUrl.includes("/users")) {
      const usersLink = page.getByRole("link", { name: /^Users$|^Người dùng$/i }).first();
      if (await usersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await usersLink.click({ timeout: 5000 });
        await page.waitForTimeout(3000);
      } else {
        await page.goto(usersUrl, { waitUntil: WAIT_UNTIL, timeout: NAV_TIMEOUT }).catch(() => {});
        await page.waitForTimeout(3000);
      }
    }

    currentUrl = page.url();
    if (currentUrl.includes("auth.services") || currentUrl.includes("adobelogin.com")) {
      logger.warn("[delete-users-pw] Redirect về login sau /users");
      freshCookies = fromPwCookies(await context.cookies());
      return { deleted: [], failed: userList, savedCookies: freshCookies };
    }

    // Đợi bảng users xuất hiện (trang có banner thanh toán có thể load chậm)
    await page.waitForSelector('input[type="checkbox"], [role="checkbox"], table tbody tr', { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const remaining = [...userList];

    while (remaining.length > 0) {
      const toProcessNow = [];
      for (const ue of remaining) {
        const selected = await selectUserByEmail(page, ue);
        if (selected) toProcessNow.push(ue);
      }

      if (toProcessNow.length === 0) {
        logger.warn("[delete-users-pw] Không chọn được user nào (emails: %s). Kiểm tra selector hoặc email có đúng trên trang.", remaining.join(", "));
        remaining.forEach((ue) => failed.push(ue));
        break;
      }

      const clicked = await clickDeleteUserButton(page);
      if (!clicked) {
        logger.warn("[delete-users-pw] Không bấm được Xóa người dùng");
        toProcessNow.forEach((ue) => failed.push(ue));
        remaining.splice(0, remaining.length);
        break;
      }

      await page.waitForTimeout(2000);

      const continued = await maybeClickContinueInModal(page);
      if (continued) await page.waitForTimeout(1500);

      // Nếu là popup confirm đơn giản (Remove users) thì không có bước B4/B5, skip handleDeleteModalOptions.
      let hasSimpleConfirm = false;
      try {
        const alertDialog = page.getByRole("alertdialog").first();
        hasSimpleConfirm = await alertDialog.isVisible({ timeout: 1000 }).catch(() => false);
      } catch (_) {
        hasSimpleConfirm = false;
      }

      if (!hasSimpleConfirm) {
        const modalOk = await handleDeleteModalOptions(page);
        if (!modalOk) {
          logger.warn("[delete-users-pw] Lỗi modal chọn option");
          toProcessNow.forEach((ue) => failed.push(ue));
          remaining.splice(0, remaining.length);
          break;
        }
      } else {
        logger.info("[delete-users-pw] Flow simple-confirm: chỉ hiện popup Remove users, bỏ qua B4/B5");
      }

      const confirmOk = await confirmDeleteUsers(page);
      if (!confirmOk) {
        logger.warn("[delete-users-pw] Lỗi confirm");
        toProcessNow.forEach((ue) => failed.push(ue));
        remaining.splice(0, remaining.length);
        break;
      }

      toProcessNow.forEach((ue) => deleted.push(ue));
      remaining.splice(0, remaining.length, ...remaining.filter((ue) => !toProcessNow.includes(ue)));

      if (remaining.length > 0) {
        await page.waitForTimeout(2000);
        const url = page.url();
        const m = url.match(/^(https:\/\/adminconsole\.adobe\.com\/[^/]+@AdobeOrg)/);
        const nextUsersUrl = m ? `${m[1]}/users` : USERS_URL;
        await page.goto(nextUsersUrl, { waitUntil: WAIT_UNTIL, timeout: NAV_TIMEOUT }).catch(() => {});
        await page.waitForTimeout(3000);
      }
    }

    freshCookies = fromPwCookies(await context.cookies());
    logger.info("[delete-users-pw] Done: deleted=%d, failed=%d", deleted.length, failed.length);
    return { deleted, failed, savedCookies: freshCookies };
  } catch (err) {
    logger.error("[delete-users-pw] Lỗi: %s", err.message);
    try {
      const ctx = browser.contexts()[0];
      if (ctx) freshCookies = fromPwCookies(await ctx.cookies());
    } catch (_) {}
    return {
      deleted,
      failed: failed.length > 0 ? failed : userList,
      savedCookies: freshCookies,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { deleteUsersViaBrowser };
