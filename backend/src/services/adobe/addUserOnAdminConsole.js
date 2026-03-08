/**
 * Luồng thêm user trên Admin Console — khớp script hệ thống hoàn chỉnh.
 * B1: mở modal (add-users-btn) → B2: nhập email → B3: mở dropdown → B4: chọn option trong overlay (hoặc ArrowDown+Enter) →
 * B4.1: mở popup sản phẩm → B4.2: chọn Creative Cloud Pro → B4.3: Áp dụng (cta-button) → B5: Lưu (cta-button trong dialog ngoài).
 */

const logger = require("../../utils/logger");

const WAIT_DEFAULT_MS = 1500;
const WAIT_AFTER_DROPDOWN_MS = 1200;
const WAIT_AFTER_OPTION_MS = 1500;
const WAIT_AFTER_ASSIGNMENT_MS = 1200;
const WAIT_AFTER_PRODUCT_CLICK_MS = 1000;
const WAIT_AFTER_APPLY_MS = 1800;

function wait(ms = WAIT_DEFAULT_MS) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Trên trang adminconsole.adobe.com/users: thêm nhiều user trong một modal.
 * Mỗi user: B2 nhập email → B3 dropdown → B4 option/ArrowDown+Enter → B4.1 assignment → B4.2 Creative Cloud Pro → B4.3 Áp dụng. Cuối cùng B5 Lưu.
 *
 * @param {import('puppeteer').Page} page - Đã ở trang Admin Console Users
 * @param {string[]} userEmails - Danh sách email cần thêm (tối thiểu 1)
 */
async function addMultipleUsersOnAdminConsole(page, userEmails) {
  const emails = (Array.isArray(userEmails) ? userEmails : [userEmails])
    .map((e) => String(e).trim())
    .filter(Boolean);
  if (emails.length === 0) throw new Error("Danh sách email không được rỗng.");

  logger.info("[adobe] addMultipleUsersOnAdminConsole: %s user(s), luồng B1→B2→B3→B4→B4.1→B4.2→B4.3→B5", emails.length);

  // B1: Mở modal thêm user — button[data-testid="add-users-btn"]
  const b1Ok = await page.evaluate(() => {
    const isVisible = (el) =>
      !!el &&
      el.offsetParent !== null &&
      getComputedStyle(el).visibility !== "hidden" &&
      getComputedStyle(el).display !== "none";
    const getVisible = (selector, root = document) =>
      [...(root.querySelectorAll(selector) || [])].find(isVisible) || null;
    const btn = getVisible('button[data-testid="add-users-btn"]');
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!b1Ok) throw new Error('Không tìm thấy button[data-testid="add-users-btn"]');
  await wait();

  for (let i = 0; i < emails.length; i++) {
    const em = emails[i];
    logger.info("[adobe] User %s/%s: %s", i + 1, emails.length, em.replace(/(.{2}).*@(.*)/, "$1***@$2"));

    if (i >= 2) {
      const added = await page.evaluate(() => {
        const isVisible = (el) =>
          !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
        const getVisible = (selector) => [...document.querySelectorAll(selector)].find(isVisible) || null;
        const btn = getVisible('button[data-testid="add-users-btn"]');
        if (!btn) return false;
        btn.click();
        return true;
      });
      if (added) await wait();
    }

    // B2: Nhập email — setNativeInputValue vào input thứ i (visible)
    const b2Ok = await page.evaluate(
      ({ index, email }) => {
        const isVisible = (el) =>
          !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
        const getVisible = (selector, root = document) =>
          [...(root.querySelectorAll(selector) || [])].find(isVisible) || null;
        const getAllVisible = (selector, root = document) =>
          [...(root.querySelectorAll(selector) || [])].filter(isVisible);
        const inputs = getAllVisible('input[data-testid="user-picker"]');
        const input = inputs[index];
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        if (!setter) return false;
        input.focus();
        input.click();
        setter.call(input, email);
        input.dispatchEvent(new InputEvent("input", { bubbles: true, data: email, inputType: "insertText" }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      },
      { index: i, email: em }
    );
    if (!b2Ok) throw new Error(`Không điền được email vào ô ${i + 1}: ${em}`);
    await wait();

    // B3: Mở dropdown cạnh input — button[aria-haspopup="listbox"] khi đi lên từ fieldWrap, fallback nút cuối trong group
    const b3Ok = await page.evaluate((idx) => {
      const isVisible = (el) =>
        !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
      const getAllVisible = (selector, root = document) =>
        [...(root.querySelectorAll(selector) || [])].filter(isVisible);
      const inputs = getAllVisible('input[data-testid="user-picker"]');
      const input = inputs[idx];
      if (!input) return false;
      let fieldWrap = input.closest("div")?.parentElement?.parentElement || input.closest("div");
      let dropdownBtn = null;
      for (let k = 0; k < 6 && fieldWrap && !dropdownBtn; k++, fieldWrap = fieldWrap.parentElement) {
        dropdownBtn = [...fieldWrap.querySelectorAll('button[aria-haspopup="listbox"]')].find(isVisible) || null;
      }
      if (!dropdownBtn) {
        const group = input.closest("div");
        const btns = group ? [...(group.parentElement?.querySelectorAll("button") || [])].filter(isVisible) : [];
        dropdownBtn = btns.length ? btns[btns.length - 1] : null;
      }
      if (!dropdownBtn) return false;
      dropdownBtn.click();
      return true;
    }, i);
    if (!b3Ok) logger.warn("[adobe] User %s: không tìm thấy nút dropdown", i + 1);
    await new Promise((r) => setTimeout(r, WAIT_AFTER_DROPDOWN_MS));

    // B4: Chọn option đầu tiên trong overlay (role=option/menuitem hoặc phần tử lớn), không thì ArrowDown + Enter
    const b4Done = await page.evaluate((idx) => {
      const isVisible = (el) =>
        !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
      const getVisible = (selector, root = document) =>
        [...(root.querySelectorAll(selector) || [])].find(isVisible) || null;
      const getAllVisible = (selector, root = document) =>
        [...(root.querySelectorAll(selector) || [])].filter(isVisible);
      const inputs = getAllVisible('input[data-testid="user-picker"]');
      const input = inputs[idx];
      const overlays = getAllVisible('[data-testid="overlay-container"]');
      const topOverlay = overlays.length ? overlays[overlays.length - 1] : null;
      let newUserOption = null;
      if (topOverlay) {
        newUserOption =
          getVisible('[role="option"]', topOverlay) ||
          getVisible('[role="menuitem"]', topOverlay) ||
          [...topOverlay.querySelectorAll("div, button, li")].find((el) => {
            if (!isVisible(el)) return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 120 && rect.height > 24;
          }) ||
          null;
      }
      if (newUserOption) {
        newUserOption.click();
        return true;
      }
      if (input) {
        input.focus();
        document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
        document.activeElement?.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowDown", bubbles: true }));
      }
      return false;
    }, i);
    if (!b4Done) {
      await new Promise((r) => setTimeout(r, 500));
      await page.keyboard.down("Enter");
      await page.keyboard.up("Enter");
    }
    await wait(WAIT_AFTER_OPTION_MS);

    // B4.1: Mở popup chọn sản phẩm — button[data-testid="assignment-modal-open-button"] (thứ i)
    const btns = await page.evaluate(() => {
      const isVisible = (el) =>
        !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
      return [...document.querySelectorAll('button[data-testid="assignment-modal-open-button"]')].filter(isVisible).length;
    });
    const assignmentIdx = Math.min(i, Math.max(0, btns - 1));
    const b41Ok = await page.evaluate((idx) => {
      const isVisible = (el) =>
        !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
      const arr = [...document.querySelectorAll('button[data-testid="assignment-modal-open-button"]')].filter(isVisible);
      const btn = arr[idx];
      if (!btn) return false;
      btn.click();
      return true;
    }, assignmentIdx);
    if (!b41Ok) logger.warn("[adobe] User %s: không tìm thấy nút assignment", i + 1);
    await new Promise((r) => setTimeout(r, WAIT_AFTER_ASSIGNMENT_MS));

    // B4.2: Chọn Creative Cloud Pro — trong dialog trên cùng: row aria-label Creative Cloud Pro → ListViewItem-grid / grid / row
    const b42Ok = await page.evaluate(() => {
      const isVisible = (el) =>
        !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
      const getVisible = (selector, root = document) =>
        [...(root.querySelectorAll(selector) || [])].find(isVisible) || null;
      const getAllVisible = (selector, root = document) =>
        [...(root.querySelectorAll(selector) || [])].filter(isVisible);
      const dialogs = getAllVisible('[role="dialog"]');
      const productDialog = dialogs.length ? dialogs[dialogs.length - 1] : document;
      const ccRow =
        getVisible('[role="row"][aria-label="Creative Cloud Pro"]', productDialog) ||
        getVisible('[role="row"][aria-label*="Creative Cloud Pro"]', productDialog);
      if (!ccRow) return false;
      const ccGrid =
        getVisible('[class*="ListViewItem-grid"]', ccRow) ||
        getVisible('div[style*="display: grid"]', ccRow) ||
        ccRow;
      ccGrid.click();
      return true;
    });
    if (!b42Ok) logger.warn("[adobe] User %s: không tìm thấy row Creative Cloud Pro", i + 1);
    await new Promise((r) => setTimeout(r, WAIT_AFTER_PRODUCT_CLICK_MS));

    // B4.3: Bấm Áp dụng trong popup sản phẩm — button[data-testid="cta-button"] trong dialog trên cùng
    const b43Ok = await page.evaluate(() => {
      const isVisible = (el) =>
        !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
      const getAllVisible = (selector, root = document) =>
        [...(root.querySelectorAll(selector) || [])].filter(isVisible);
      const dialogs = getAllVisible('[role="dialog"]');
      const currentProductDialog = dialogs.length ? dialogs[dialogs.length - 1] : document;
      const applyBtn = [...currentProductDialog.querySelectorAll('button[data-testid="cta-button"]')].find(
        (btn) => isVisible(btn) && !btn.disabled
      );
      if (!applyBtn) return false;
      applyBtn.click();
      return true;
    });
    if (!b43Ok) logger.warn("[adobe] User %s: không tìm thấy nút Áp dụng (cta-button)", i + 1);
    await new Promise((r) => setTimeout(r, WAIT_AFTER_APPLY_MS));
  }

  // B5: Bấm Lưu form ngoài — dialog ngoài cùng, button[data-testid="cta-button"]
  const b5Ok = await page.evaluate(() => {
    const isVisible = (el) =>
      !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
    const getAllVisible = (selector, root = document) =>
      [...(root.querySelectorAll(selector) || [])].filter(isVisible);
    const dialogsAfterApply = getAllVisible('[role="dialog"]');
    const outerDialog = dialogsAfterApply.length ? dialogsAfterApply[dialogsAfterApply.length - 1] : document;
    const saveBtn = [...outerDialog.querySelectorAll('button[data-testid="cta-button"]')].find(
      (btn) => isVisible(btn) && !btn.disabled
    );
    if (!saveBtn) return false;
    saveBtn.click();
    return true;
  });
  if (!b5Ok) throw new Error("Không tìm thấy nút Lưu (cta-button trong dialog ngoài).");

  logger.info("[adobe] Đã bấm Lưu thêm %s user.", emails.length);
  await wait();
}

/**
 * Thêm một user (gọi addMultipleUsersOnAdminConsole với 1 email).
 * @param {import('puppeteer').Page} page
 * @param {string} userEmail
 */
async function addUserOnAdminConsole(page, userEmail) {
  await addMultipleUsersOnAdminConsole(page, [userEmail]);
}

module.exports = {
  addUserOnAdminConsole,
  addMultipleUsersOnAdminConsole,
};
