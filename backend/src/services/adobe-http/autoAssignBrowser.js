/**
 * Playwright: tự động tạo hoặc lấy URL auto-assign product trên Adobe Admin Console.
 *
 * Flow (1 browser duy nhất):
 * 1. Mở browser → import cookies từ DB → navigate tới Admin Console
 * 2. Nếu cookies hợp lệ → đang ở Admin Console → navigate tiếp tới /products/auto-assign
 * 3. Nếu cookies hết hạn → chạy form login (email/password/OTP) → navigate tới auto-assign
 * 4. Lấy URL (click clipboard nếu có rule) hoặc tạo mới (wizard)
 * 5. Đóng browser, trả URL + cookies mới
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
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

/**
 * @param {string} orgId
 * @param {string} email
 * @param {string} password
 * @param {object} options - { savedCookies, mailBackupId }
 * @returns {{ url: string|null, savedCookies: object[]|null }}
 */
async function getOrCreateAutoAssignUrl(orgId, email, password, options = {}) {
  if (!orgId || !email || !password) {
    logger.warn("[auto-assign-pw] Thiếu orgId/email/password");
    return { url: null, savedCookies: null };
  }

  const savedCookies = options.savedCookies || [];
  const mailBackupId = options.mailBackupId || null;
  const autoAssignUrl = `https://adminconsole.adobe.com/${orgId}@AdobeOrg/products/auto-assign`;

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  logger.info("[auto-assign-pw] Khởi động Playwright (headless=%s)...", headless);

  const browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 80,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  let freshCookies = null;

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});

    // Import cookies từ DB
    const pwCookies = toPwCookies(savedCookies);
    if (pwCookies.length > 0) {
      await context.addCookies(pwCookies);
      logger.info("[auto-assign-pw] Imported %d cookies từ DB", pwCookies.length);
    }

    const page = await context.newPage();

    // === BƯỚC 1: Cookie-login — navigate tới Admin Console ===
    logger.info("[auto-assign-pw] B1: Navigate tới Admin Console...");
    await page.goto(ADOBE_ENTRY_URL, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);

    let currentUrl = page.url();
    logger.info("[auto-assign-pw] URL sau navigate: %s", currentUrl.slice(0, 150));

    // Nếu redirect về login → cookies hết hạn → chạy form login
    if (currentUrl.includes("auth.services") || currentUrl.includes("adobelogin.com")) {
      logger.info("[auto-assign-pw] Cookies hết hạn → chạy form login...");
      const loginOk = await doFormLogin(page, email, password, mailBackupId);
      if (!loginOk) {
        logger.warn("[auto-assign-pw] Form login thất bại");
        return { url: null, savedCookies: null };
      }
      currentUrl = page.url();
      logger.info("[auto-assign-pw] Sau form login: %s", currentUrl.slice(0, 150));
    } else {
      logger.info("[auto-assign-pw] Cookie-login OK");
    }

    // === BƯỚC 2: Navigate tới /products/auto-assign ===
    logger.info("[auto-assign-pw] B2: Navigate tới %s", autoAssignUrl);
    await page.goto(autoAssignUrl, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(4000);

    currentUrl = page.url();
    logger.info("[auto-assign-pw] Auto-assign page URL: %s", currentUrl.slice(0, 150));

    if (currentUrl.includes("auth.services") || currentUrl.includes("adobelogin.com")) {
      logger.warn("[auto-assign-pw] Vẫn bị redirect login → abort");
      freshCookies = fromPwCookies(await context.cookies());
      return { url: null, savedCookies: freshCookies };
    }

    // Đợi SPA load
    await page.waitForFunction(
      () => window.location.href.includes("auto-assign") || window.location.href.includes("@AdobeOrg"),
      { timeout: 15000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);

    // === BƯỚC 3: Lấy hoặc tạo URL ===
    const pageText = await page.locator("body").innerText().catch(() => "");

    // Detect EMPTY state trước — "Set up your first" hoặc "Thiết lập quy tắc đầu tiên"
    const isEmpty = /set up your first|no.*rule|thiết lập.*đầu tiên|chưa có quy tắc/i.test(pageText);
    if (isEmpty) {
      logger.info("[auto-assign-pw] Trang trống (chưa có rule) → tạo mới");
    }

    let hasExistingRule = false;
    if (!isEmpty) {
      // Chỉ coi là có rule nếu tìm thấy nội dung product thực sự (không phải header/layout)
      const dataRows = await page.locator("table tbody tr").count().catch(() => 0);
      if (dataRows > 0) {
        hasExistingRule = true;
        logger.info("[auto-assign-pw] Existing rules (table rows): %d", dataRows);
      } else {
        // Fallback: check text chứa product name + status (active/paused)
        const hasProduct = /creative cloud|all apps|acrobat|photoshop|illustrator/i.test(pageText);
        const hasStatus = /\bactive\b|\bpaused\b|\bhoạt động\b|\btạm dừng\b/i.test(pageText);
        if (hasProduct && hasStatus) {
          hasExistingRule = true;
          logger.info("[auto-assign-pw] Existing rules (text match: product + status)");
        }
      }
    }

    let url = null;

    if (hasExistingRule) {
      url = await tryGetExistingUrl(page);
      if (url) logger.info("[auto-assign-pw] URL từ rule có sẵn: %s", url);
    }

    if (!url) {
      logger.info("[auto-assign-pw] Tạo rule mới...");
      url = await createNewRule(page);
      if (url) {
        logger.info("[auto-assign-pw] Tạo URL thành công: %s", url);
      } else {
        logger.warn("[auto-assign-pw] Không tạo được URL");
      }
    }

    // Lưu cookies mới từ browser session
    freshCookies = fromPwCookies(await context.cookies());
    return { url, savedCookies: freshCookies };
  } catch (err) {
    logger.error("[auto-assign-pw] Lỗi: %s", err.message);
    return { url: null, savedCookies: freshCookies };
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Form login dùng helpers từ loginBrowser.js (detectScreen, enterPassword, handle2FA...).
 * Giống hệt luồng loginWithPlaywright nhưng chạy trên page/context đã có sẵn.
 */
async function doFormLogin(page, email, password, mailBackupId) {
  try {
    // Đợi trang login load
    await page.waitForURL(/auth\.services\.adobe\.com|adobelogin\.com/, { timeout: 30000 }).catch(() => {});
    logger.info("[auto-assign-pw] Trang login: %s", page.url().slice(0, 120));

    // B1: Nhập email
    const emailInput = page.locator('input[name="username"], input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 45000 });
    await emailInput.click();
    await page.keyboard.type(email, { delay: 25 });
    await page.waitForTimeout(150);
    await page.keyboard.press("Enter");
    logger.info("[auto-assign-pw] Đã nhập email");

    // B2: Detect screen (dùng helper từ loginBrowser.js — đợi đúng transition)
    const afterEmail = await detectScreen(page, 15000);
    logger.info("[auto-assign-pw] Sau email → screen: %s", afterEmail);

    // B3: Xử lý theo screen type
    if (afterEmail === "2fa") {
      await handle2FA(page, mailBackupId);
      const after2fa = await detectScreen(page, 10000);
      logger.info("[auto-assign-pw] Sau 2FA → screen: %s", after2fa);
      if (after2fa === "password") {
        await enterPassword(page, password);
      }
    } else if (afterEmail === "password") {
      await enterPassword(page, password);
      const afterPw = await detectScreen(page, 10000);
      logger.info("[auto-assign-pw] Sau password → screen: %s", afterPw);
      if (afterPw === "2fa") {
        await handle2FA(page, mailBackupId);
      }
    } else {
      logger.warn("[auto-assign-pw] Unknown screen: %s", page.url().slice(0, 120));
    }

    // B4: Skip security prompt + progressive profile
    await maybeSkipSecurityPrompt(page);
    await handleProgressiveProfile(page, mailBackupId);

    // B5: Đợi login thành công
    logger.info("[auto-assign-pw] Đợi redirect tới Admin Console...");
    await page.waitForFunction(
      () => {
        const h = window.location.href;
        return (
          h.includes("@AdobeOrg") ||
          (/^https?:\/\/([a-z0-9-]+\.)*adobe\.com/i.test(h) && !h.includes("auth.services"))
        );
      },
      { timeout: 90000 }
    ).catch(() => {});
    await page.waitForTimeout(2500);

    const finalUrl = page.url();
    const ok = finalUrl.includes("adminconsole.adobe.com") || finalUrl.includes("@AdobeOrg");
    logger.info("[auto-assign-pw] Form login %s — URL: %s", ok ? "thành công" : "thất bại", finalUrl.slice(0, 120));
    return ok;
  } catch (e) {
    logger.error("[auto-assign-pw] doFormLogin error: %s", e.message);
    return false;
  }
}

/**
 * Lấy URL từ rule đã có sẵn.
 * ACTIONS column (cột cuối trong table) chứa icon buttons: pencil (edit) + clipboard (copy URL).
 * Phải tìm trong vùng content — KHÔNG phải header/nav bar.
 */
async function tryGetExistingUrl(page) {
  try {
    // Giới hạn scope: tìm trong main content area, không phải header
    const contentArea = page.locator('main, [role="main"], [class*="content"], [class*="Content"]').first();
    const scope = (await contentArea.isVisible({ timeout: 2000 }).catch(() => false))
      ? contentArea
      : page;

    // Scan page HTML trước — nhanh nhất, không cần click
    const html = await page.content().catch(() => "");
    const htmlMatch = html.match(/https:\/\/acrs\.adobe\.com\/go\/[a-f0-9-]+/i);
    if (htmlMatch) {
      logger.info("[auto-assign-pw] URL tìm thấy trong page HTML: %s", htmlMatch[0]);
      return htmlMatch[0];
    }

    // Tìm nút copy TRONG content area (tránh match header icons)
    const copySelectors = [
      '[aria-label*="copy" i]',
      '[aria-label*="sao chép" i]',
      '[aria-label*="Copy link" i]',
      '[aria-label*="clipboard" i]',
    ];

    let copyBtn = null;
    for (const sel of copySelectors) {
      const btn = scope.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        const tag = await btn.evaluate((el) => el.tagName.toLowerCase()).catch(() => "");
        const ariaLabel = await btn.getAttribute("aria-label").catch(() => "");
        logger.info("[auto-assign-pw] Nút copy candidate: %s tag=%s aria-label=%s", sel, tag, ariaLabel);
        // Chỉ chấp nhận nếu là button/action-button, không phải span/div header
        if (/button|sp-action-button|a/i.test(tag)) {
          copyBtn = btn;
          break;
        }
      }
    }

    // Fallback: tìm action buttons trong table row / ACTIONS column
    if (!copyBtn) {
      // Tìm cột ACTIONS — thường là cột cuối, chứa icon buttons
      const rowActions = scope.locator(
        'td:last-child button, td:last-child sp-action-button, ' +
        '[class*="Cell"]:last-child button, [class*="Cell"]:last-child sp-action-button'
      );
      const actCount = await rowActions.count().catch(() => 0);
      logger.info("[auto-assign-pw] Row action buttons: %d", actCount);
      if (actCount >= 2) {
        copyBtn = rowActions.nth(actCount - 1); // copy thường là nút cuối
      } else if (actCount === 1) {
        copyBtn = rowActions.first();
      }
    }

    if (copyBtn) {
      // Verify button chưa bị overlay chặn trước khi click
      const box = await copyBtn.boundingBox().catch(() => null);
      if (!box) {
        logger.warn("[auto-assign-pw] Copy button không có bounding box — skip");
        return null;
      }
      logger.info("[auto-assign-pw] Click copy button (pos: %dx%d)...", Math.round(box.x), Math.round(box.y));
      await copyBtn.click({ timeout: 5000 });
      await page.waitForTimeout(2000);

      const clipText = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
      if (clipText.includes("acrs.adobe.com/go/")) {
        logger.info("[auto-assign-pw] URL từ clipboard: %s", clipText.trim());
        return clipText.trim();
      }

      const url = await extractAcrsUrlFromPage(page);
      if (url) return url;
    }

    logger.info("[auto-assign-pw] Không tìm thấy URL từ rule có sẵn");
    return null;
  } catch (e) {
    logger.info("[auto-assign-pw] tryGetExistingUrl error: %s", e.message);
    return null;
  }
}

/**
 * Tạo rule auto-assign mới qua wizard UI.
 * B1: Thêm sản phẩm → B2: Chọn product → B3: Tiếp → B4: Tiếp → B5: Lưu → B6: Copy URL
 *
 * Adobe Admin Console dùng Spectrum: sp-button, sp-action-button, spectrum-Button, etc.
 */
async function createNewRule(page) {
  try {
    // B1: Click "Thêm sản phẩm" / "Add product"
    logger.info("[auto-assign-pw] B1: Click 'Add product'...");
    const addBtn = await findClickable(page, /thêm sản phẩm|add product/i);
    if (!addBtn) {
      logger.warn("[auto-assign-pw] Không tìm thấy nút Add product");
      await debugLogPageButtons(page);
      return null;
    }
    await addBtn.click();
    await page.waitForTimeout(2000);

    // B2: Chọn product từ Combobox (input search + chevron dropdown)
    logger.info("[auto-assign-pw] B2: Mở dropdown chọn product...");
    let dropdownOpened = false;

    // Strategy 1: Click chevron button bên phải input
    const chevronSelectors = [
      '[class*="spectrum-Combobox"] button',
      '[class*="InputGroup"] button',
      '[class*="combobox"] button',
      'button[aria-label*="chevron" i]',
      'button[aria-label*="dropdown" i]',
      'button[aria-label*="toggle" i]',
      'button[aria-label*="open" i]',
      'button[aria-haspopup="listbox"]',
      'sp-picker',
    ];
    for (const sel of chevronSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        logger.info("[auto-assign-pw] Chevron found: %s", sel);
        await el.click();
        dropdownOpened = true;
        break;
      }
    }

    // Strategy 2: Click vào input combobox
    if (!dropdownOpened) {
      const comboSelectors = [
        '[role="combobox"]',
        'input[aria-haspopup="listbox"]',
        'sp-combobox',
        'input[class*="spectrum-Textfield"]',
        'input[placeholder*="earch" i]',
        'input[placeholder*="elect" i]',
        'input[placeholder*="roduct" i]',
      ];
      for (const sel of comboSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
          logger.info("[auto-assign-pw] Combobox input found: %s", sel);
          await el.click();
          dropdownOpened = true;
          break;
        }
      }
    }

    // Strategy 3: Tìm bất kỳ element nào gần label "Search and select a product"
    if (!dropdownOpened) {
      const label = page.locator('text=/search and select|tìm và chọn|chọn sản phẩm/i');
      if (await label.isVisible({ timeout: 1500 }).catch(() => false)) {
        const parent = label.locator("xpath=..");
        const input = parent.locator("input, button, [role='combobox']").first();
        if (await input.isVisible({ timeout: 1500 }).catch(() => false)) {
          logger.info("[auto-assign-pw] Found combobox via label proximity");
          await input.click();
          dropdownOpened = true;
        }
      }
    }

    if (!dropdownOpened) {
      logger.warn("[auto-assign-pw] Không mở được dropdown, thử dump DOM...");
      await debugLogPageButtons(page);
    }
    await page.waitForTimeout(2000);

    // Đợi options xuất hiện
    const option = page.locator('[role="option"], [role="listbox"] > *, sp-menu-item').first();
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
      const optionText = await option.textContent().catch(() => "");
      logger.info("[auto-assign-pw] Chọn product: %s", optionText.trim());
      await option.click();
    } else {
      logger.warn("[auto-assign-pw] Không thấy option trong dropdown — thử click lại chevron");
      // Retry: click chevron lần 2
      const retryBtn = page.locator('[class*="spectrum-Combobox"] button, [aria-haspopup="listbox"]').first();
      await retryBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
      const retryOption = page.locator('[role="option"]').first();
      if (await retryOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        const txt = await retryOption.textContent().catch(() => "");
        logger.info("[auto-assign-pw] Chọn product (retry): %s", txt.trim());
        await retryOption.click();
      } else {
        logger.warn("[auto-assign-pw] Vẫn không thấy option");
      }
    }
    await page.waitForTimeout(1500);

    // B3: Click "Next" (Step 1 → Step 2) — đợi button enabled
    logger.info("[auto-assign-pw] B3: Đợi Next enabled rồi click...");
    await waitAndClickEnabled(page, /tiếp theo|next/i, 15000);
    await page.waitForTimeout(2000);

    // B4: Click "Next" (Step 2 → Step 3)
    logger.info("[auto-assign-pw] B4: Đợi Next enabled rồi click...");
    await waitAndClickEnabled(page, /tiếp theo|next/i, 15000);
    await page.waitForTimeout(2000);

    // B5: Click "Save" / "Lưu"
    logger.info("[auto-assign-pw] B5: Đợi Save enabled rồi click...");
    await waitAndClickEnabled(page, /^lưu$|^save$/i, 15000);

    // B6: Đợi dialog/page hiện URL — thử nhiều lần với khoảng cách
    logger.info("[auto-assign-pw] B6: Đợi URL xuất hiện...");
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.waitForTimeout(2000);
      const url = await extractAcrsUrlFromPage(page);
      if (url) return url;
      logger.info("[auto-assign-pw] B6: Chưa thấy URL, thử lại (%d/5)...", attempt + 1);
    }

    // Fallback cuối: scan toàn bộ HTML
    const html = await page.content().catch(() => "");
    const match = html.match(/https:\/\/acrs\.adobe\.com\/go\/[a-f0-9-]+/i);
    if (match) {
      logger.info("[auto-assign-pw] URL từ page HTML (fallback): %s", match[0]);
      return match[0];
    }

    return null;
  } catch (e) {
    logger.error("[auto-assign-pw] createNewRule error: %s", e.message);
    return null;
  }
}

/**
 * Tìm phần tử clickable (button, sp-button, sp-action-button, [role=button], a)
 * theo text regex. Hỗ trợ cả native HTML buttons và Spectrum custom elements.
 */
async function findClickable(page, textRegex, timeout = 10000) {
  const strategies = [
    () => page.locator("button, sp-button, sp-action-button").filter({ hasText: textRegex }).first(),
    () => page.locator('[role="button"]').filter({ hasText: textRegex }).first(),
    () => page.locator("a").filter({ hasText: textRegex }).first(),
    () => page.getByRole("button", { name: textRegex }),
  ];

  for (const strategy of strategies) {
    try {
      const el = strategy();
      if (await el.isVisible({ timeout: Math.min(timeout, 3000) }).catch(() => false)) {
        return el;
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Đợi button enabled rồi mới click. Poll mỗi 1s trong maxWait ms.
 * Tránh click button disabled (vô tác dụng).
 */
async function waitAndClickEnabled(page, textRegex, maxWait = 15000) {
  const deadline = Date.now() + maxWait;

  while (Date.now() < deadline) {
    const el = await findClickable(page, textRegex);
    if (el) {
      const disabled = await el.isDisabled().catch(() => true);
      if (!disabled) {
        const text = await el.textContent().catch(() => "");
        logger.info("[auto-assign-pw] Click '%s' (enabled)", text.trim());
        await el.click();
        return;
      }
      logger.info("[auto-assign-pw] Button '%s' disabled — đợi...", textRegex);
    }
    await page.waitForTimeout(1000);
  }

  // Hết timeout — thử force click button cuối cùng match
  logger.warn("[auto-assign-pw] Timeout đợi '%s' enabled — force click", textRegex);
  const fallback = page.locator("button, sp-button, [role='button']").filter({ hasText: textRegex }).last();
  await fallback.click({ timeout: 5000 });
}

async function debugLogPageButtons(page) {
  try {
    const btns = await page.evaluate(() => {
      const els = document.querySelectorAll(
        'button, [role="button"], sp-button, sp-action-button, a[class*="Button"]'
      );
      return [...els].slice(0, 20).map((e) => ({
        tag: e.tagName.toLowerCase(),
        text: (e.textContent || "").trim().slice(0, 60),
        cls: (e.className || "").toString().slice(0, 80),
        ariaLabel: e.getAttribute("aria-label") || "",
      }));
    });
    logger.info("[auto-assign-pw] Page buttons dump: %s", JSON.stringify(btns));
  } catch (_) {}
}

/**
 * Tìm URL acrs.adobe.com trong toàn bộ page content (input, text, dialog...).
 */
async function extractAcrsUrlFromPage(page) {
  try {
    // Tìm trong input fields
    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    for (let i = 0; i < inputCount; i++) {
      const val = await inputs.nth(i).inputValue().catch(() => "");
      if (val.includes("acrs.adobe.com/go/")) {
        return val.trim();
      }
    }

    // Tìm trong text content toàn page
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const match = bodyText.match(/https:\/\/acrs\.adobe\.com\/go\/[a-f0-9-]+/i);
    if (match) return match[0];

    // Tìm trong textarea
    const textareas = page.locator("textarea");
    const taCount = await textareas.count();
    for (let i = 0; i < taCount; i++) {
      const val = await textareas.nth(i).inputValue().catch(() => "");
      if (val.includes("acrs.adobe.com/go/")) {
        return val.trim();
      }
    }

    // Tìm trong clipboard nếu có nút "Sao chép"
    const copyBtn = page.locator("button").filter({ hasText: /sao chép|copy/i }).first();
    if (await copyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyBtn.click();
      await page.waitForTimeout(500);
      const clipText = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
      if (clipText.includes("acrs.adobe.com/go/")) {
        return clipText.trim();
      }
    }

    return null;
  } catch (e) {
    logger.debug("[auto-assign-pw] extractAcrsUrlFromPage error: %s", e.message);
    return null;
  }
}

module.exports = { getOrCreateAutoAssignUrl };
