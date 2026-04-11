/**
 * Adobe Renew V2 — B14: Lấy hoặc tạo URL auto-assign (Admin Console).
 * Dùng chung page/context sau B13, không launch/đóng browser.
 */

const logger = require("../../utils/logger");
const { doFormLoginOnAuthPage } = require("./loginFlow");
const { fromPwCookies } = require("./runCheckFlow");

/**
 * B14: Lấy hoặc tạo URL auto-assign trên cùng page (đã login sau B1–B13).
 * @param {import('playwright').Page} page - Page đã ở Admin Console (sau runCheckFlow B13)
 * @param {string} orgId
 * @param {string} email
 * @param {string} password
 * @param {{ mailBackupId?: number, otpSource?: string }} options
 * @returns {Promise<{ url: string|null, savedCookies: object[]|null }>}
 */
async function getOrCreateAutoAssignUrlWithPage(page, orgId, email, password, options = {}) {
  if (!orgId || !email || !password) {
    logger.warn("[adobe-v2] B14: Thiếu orgId/email/password");
    return { url: null, savedCookies: null };
  }
  const mailBackupId = options.mailBackupId ?? null;
  const otpSource = options.otpSource ?? "imap";
  const autoAssignUrl = `https://adminconsole.adobe.com/${orgId}@AdobeOrg/products/auto-assign`;
  let freshCookies = null;

  try {
    const context = page.context();
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});

    logger.info("[adobe-v2] B14: Navigate tới auto-assign...");
    await page.goto(autoAssignUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);

    let currentUrl = page.url();
    if (currentUrl.includes("auth.services") || currentUrl.includes("adobelogin.com")) {
      logger.info("[adobe-v2] B14: Bị redirect login → form login...");
      const loginOk = await doFormLoginOnAuthPage(page, email, password, {
        mailBackupId,
        otpSource,
        accountEmail: email,
      });
      if (!loginOk) return { url: null, savedCookies: null };
      await page.goto(autoAssignUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2500);
      currentUrl = page.url();
    }
    if (currentUrl.includes("auth.services") || currentUrl.includes("adobelogin.com")) {
      logger.warn("[adobe-v2] B14: Vẫn redirect login → abort");
      freshCookies = fromPwCookies(await context.cookies());
      return { url: null, savedCookies: freshCookies };
    }

    // Chờ SPA render và chờ bảng rule (hoặc empty state) xuất hiện — tránh nhầm sang "Add rule"
    const b14ReadyDeadline = Date.now() + 8000;
    while (Date.now() < b14ReadyDeadline) {
      const url = page.url();
      if (url.includes("auto-assign") || url.includes("@AdobeOrg")) break;
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1500);

    // Nếu modal "Add automatic assignment rule" đang mở (sót từ lần trước) → đóng để thấy trang thật
    const addModal = page.getByRole("dialog").filter({ hasText: /Add automatic assignment rule|Thêm quy tắc chỉ định tự động/i });
    if (await addModal.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
    }

    // Chờ tối đa 10s để bảng rule hoặc nút copy xuất hiện (tránh quyết định khi trang chưa load xong)
    const tableOrCopyVisible = await page.locator('[data-testid="rule-action-group"], [data-testid="copy-to-clipboard-action-button-id"], [data-testid="table"][aria-label*="Quy tắc"]').first().isVisible({ timeout: 10000 }).catch(() => false);
    if (!tableOrCopyVisible) {
      await page.waitForTimeout(2000);
    }

    const pageText = await page.locator("body").innerText().catch(() => "");
    const isEmptyStrict = /set up your first|no.*rule|thiết lập.*đầu tiên|chưa có quy tắc|cài đặt quy tắc chỉ định tự động đầu tiên|add automatic assignment rule/i.test(pageText);
    const hasCopyBtn = (await page.locator('[data-testid="copy-to-clipboard-action-button-id"], [data-testid="copy-to-clipboard-button"]').count()) > 0;
    const hasRuleActionGroup = (await page.locator('[data-testid="rule-action-group"]').count()) > 0;
    const hasTableWithRows = (await page.locator('[data-testid="table"] [role="row"][data-key]').count()) > 0;
    const hasExistingRule = hasCopyBtn || hasRuleActionGroup || hasTableWithRows;

    let url = null;
    if (hasExistingRule) {
      url = await tryGetExistingUrl(page);
      if (url) {
        logger.info("[adobe-v2] B14: Đã sao chép URL từ rule có sẵn (không tạo mới)");
        freshCookies = fromPwCookies(await context.cookies());
        return { url, savedCookies: freshCookies };
      }
    }
    if (!url && isEmptyStrict && !hasExistingRule) {
      url = await createNewRule(page);
    } else if (!url) {
      url = await tryGetExistingUrl(page);
    }
    freshCookies = fromPwCookies(await context.cookies());
    if (url) logger.info("[adobe-v2] B14: URL=%s", url);
    return { url, savedCookies: freshCookies };
  } catch (err) {
    logger.error("[adobe-v2] B14 error: %s", err.message);
    return { url: null, savedCookies: freshCookies };
  }
}

async function tryGetExistingUrl(page) {
  try {
    const html = await page.content().catch(() => "");
    const htmlMatch = html.match(/https:\/\/acrs\.adobe\.com\/go\/[a-f0-9-]+/i);
    if (htmlMatch) {
      logger.info("[adobe-v2] B14: URL trong HTML: %s", htmlMatch[0]);
      return htmlMatch[0];
    }

    // 1) Case chuẩn: table rule + group hành động có nút copy như HTML bạn gửi
    const ruleRowCopyBtn = page
      .locator('[data-testid="rule-action-group"] button[data-testid="copy-to-clipboard-action-button-id"]')
      .first();
    if (await ruleRowCopyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      logger.info("[adobe-v2] B14: Tìm thấy rule-action-group + nút copy, bấm sao chép URL và kết thúc");
      await ruleRowCopyBtn.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);
      await ruleRowCopyBtn.click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      const clipText = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
      if (clipText && clipText.includes("acrs.adobe.com/go/")) return clipText.trim();
    }

    // 2) Fallback: các selector copy khác quanh khu vực rule
    const copySelectors = [
      '[data-testid="copy-to-clipboard-action-button-id"]',
      '[data-testid="copy-to-clipboard-button"]',
      'button[aria-label*="Sao chép URL truy cập sản phẩm" i]',
      'button[aria-label*="Copy" i][aria-label*="URL" i]',
      '[aria-label*="sao chép" i]',
      '[aria-label*="copy" i]',
    ];
    let copyBtn = null;
    for (const sel of copySelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        copyBtn = btn;
        logger.info("[adobe-v2] B14: Tìm thấy nút sao chép URL: %s", sel);
        break;
      }
    }
    if (!copyBtn) {
      const inRuleGroup = page.locator('[data-testid="rule-action-group"]').locator('button').last();
      if (await inRuleGroup.isVisible({ timeout: 1500 }).catch(() => false)) copyBtn = inRuleGroup;
    }

    if (copyBtn) {
      await copyBtn.click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      const clipText = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
      if (clipText && clipText.includes("acrs.adobe.com/go/")) return clipText.trim();
      const url = await extractAcrsUrlFromPage(page);
      if (url) return url;
    }
    return null;
  } catch (e) {
    logger.info("[adobe-v2] B14 tryGetExistingUrl error: %s", e.message);
    return null;
  }
}

async function createNewRule(page) {
  try {
    logger.info("[adobe-v2] B14: Click 'Add product'...");
    const addBtn = await findClickable(page, /thêm sản phẩm|add product/i);
    if (!addBtn) {
      logger.warn("[adobe-v2] B14: Không tìm thấy nút Add product");
      return null;
    }
    await addBtn.click();
    await page.waitForTimeout(2000);

    const chevronSelectors = ['[class*="spectrum-Combobox"] button', '[class*="InputGroup"] button', '[class*="combobox"] button', 'button[aria-label*="chevron" i]', 'button[aria-haspopup="listbox"]', 'sp-picker'];
    let dropdownOpened = false;
    for (const sel of chevronSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        await el.click();
        dropdownOpened = true;
        break;
      }
    }
    if (!dropdownOpened) {
      const comboSelectors = ['[role="combobox"]', 'input[aria-haspopup="listbox"]', 'sp-combobox', 'input[class*="spectrum-Textfield"]', 'input[placeholder*="roduct" i]'];
      for (const sel of comboSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
          await el.click();
          dropdownOpened = true;
          break;
        }
      }
    }
    if (!dropdownOpened) {
      const label = page.locator('text=/search and select|tìm và chọn|chọn sản phẩm/i');
      if (await label.isVisible({ timeout: 1500 }).catch(() => false)) {
        const parent = label.locator("xpath=..");
        const input = parent.locator("input, button, [role='combobox']").first();
        if (await input.isVisible({ timeout: 1500 }).catch(() => false)) {
          await input.click();
          dropdownOpened = true;
        }
      }
    }
    await page.waitForTimeout(2000);

    const option = page.locator('[role="option"], [role="listbox"] > *, sp-menu-item').first();
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
      await option.click();
    } else {
      const retryBtn = page.locator('[class*="spectrum-Combobox"] button, [aria-haspopup="listbox"]').first();
      await retryBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
      const retryOption = page.locator('[role="option"]').first();
      if (await retryOption.isVisible({ timeout: 3000 }).catch(() => false)) await retryOption.click();
    }
    await page.waitForTimeout(1500);

    await waitAndClickEnabled(page, /tiếp theo|next/i, 15000);
    await page.waitForTimeout(2000);
    await waitAndClickEnabled(page, /tiếp theo|next/i, 15000);
    await page.waitForTimeout(2000);
    await waitAndClickEnabled(page, /^lưu$|^save$/i, 15000);

    for (let attempt = 0; attempt < 5; attempt++) {
      await page.waitForTimeout(2000);
      const url = await extractAcrsUrlFromPage(page);
      if (url) return url;
    }
    const html = await page.content().catch(() => "");
    const match = html.match(/https:\/\/acrs\.adobe\.com\/go\/[a-f0-9-]+/i);
    return match ? match[0] : null;
  } catch (e) {
    logger.error("[adobe-v2] B14 createNewRule error: %s", e.message);
    return null;
  }
}

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
      if (await el.isVisible({ timeout: Math.min(timeout, 3000) }).catch(() => false)) return el;
    } catch (_) {}
  }
  return null;
}

async function waitAndClickEnabled(page, textRegex, maxWait = 15000) {
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    const el = await findClickable(page, textRegex);
    if (el) {
      const disabled = await el.isDisabled().catch(() => true);
      if (!disabled) {
        await el.click();
        return;
      }
    }
    await page.waitForTimeout(1000);
  }
  const fallback = page.locator("button, sp-button, [role='button']").filter({ hasText: textRegex }).last();
  await fallback.click({ timeout: 5000 });
}

async function extractAcrsUrlFromPage(page) {
  try {
    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    for (let i = 0; i < inputCount; i++) {
      const val = await inputs.nth(i).inputValue().catch(() => "");
      if (val.includes("acrs.adobe.com/go/")) return val.trim();
    }
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const match = bodyText.match(/https:\/\/acrs\.adobe\.com\/go\/[a-f0-9-]+/i);
    if (match) return match[0];
    const textareas = page.locator("textarea");
    const taCount = await textareas.count();
    for (let i = 0; i < taCount; i++) {
      const val = await textareas.nth(i).inputValue().catch(() => "");
      if (val.includes("acrs.adobe.com/go/")) return val.trim();
    }
    const copyBtn = page.locator("button").filter({ hasText: /sao chép|copy/i }).first();
    if (await copyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyBtn.click();
      await page.waitForTimeout(500);
      const clipText = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
      if (clipText.includes("acrs.adobe.com/go/")) return clipText.trim();
    }
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  getOrCreateAutoAssignUrlWithPage,
};
