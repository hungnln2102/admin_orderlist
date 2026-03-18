/**
 * Add users + assign product via Admin Console UI (V2).
 * Luồng theo docs Renew_Adobe_V2.md dòng 326–345:
 *   1. Bấm "Thêm người dùng" → mở modal add-users-to-org-modal
 *   2. Mỗi user slot: nhập email vào combobox user-picker → dropdown → "Thêm làm người dùng mới"
 *   3. Bấm "+" (assignment-modal-open-button) → chọn product → "Áp dụng"
 *   4. Bấm "Lưu" cuối form
 *
 * Form hỗ trợ tối đa ~3 user slots cùng lúc. Nếu có > 3 emails thì submit theo batch.
 */

const logger = require("../../utils/logger");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Bấm nút "Thêm người dùng" trên trang /users để mở modal.
 */
async function clickAddUserButton(page) {
  const candidates = [
    () => page.locator('button[data-testid="add-users-btn"]').first(),
    () => page.locator('button:has-text("Thêm người dùng")').first(),
    () => page.locator('button:has-text("Add user")').first(),
    () => page.getByRole("button", { name: /thêm người dùng|add user|add users/i }).first(),
    () => page.locator('[data-testid*="add-user" i], [data-testid*="addUsers" i]').first(),
  ];
  for (const getLocator of candidates) {
    try {
      const btn = getLocator();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        await btn.click({ timeout: 8000 });
        await page.waitForTimeout(1200);
        return true;
      }
    } catch (_) {}
  }
  return false;
}

/**
 * Chờ modal "Thêm người dùng vào nhóm bạn" (add-users-to-org-modal) xuất hiện.
 */
async function waitForAddUserModal(page, timeoutMs = 45000) {
  const selectors = [
    '#add-users-to-org-modal',
    '[role="dialog"][aria-labelledby]',
    '[role="dialog"]',
    '[aria-modal="true"]',
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: timeoutMs }).catch(() => false)) {
      return el;
    }
  }
  return null;
}

/**
 * Điền email vào combobox user-picker thứ `slotIndex` (0-based) trong modal.
 * Flow: fill email → bấm dropdown chevron → chọn "Thêm làm người dùng mới".
 */
async function fillEmailInSlot(page, modal, email, slotIndex) {
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!emailNorm) return false;

  // Tìm tất cả user-picker inputs trong modal
  const allPickers = modal.locator('input[data-testid="user-picker"]');
  const pickerCount = await allPickers.count().catch(() => 0);

  if (slotIndex >= pickerCount) {
    logger.warn("[adobe-v2] fillEmailInSlot: slotIndex=%d >= pickerCount=%d", slotIndex, pickerCount);
    return false;
  }

  const picker = allPickers.nth(slotIndex);
  if (!(await picker.isVisible({ timeout: 5000 }).catch(() => false))) {
    logger.warn("[adobe-v2] fillEmailInSlot: picker slot %d not visible", slotIndex);
    return false;
  }

  // Clear và nhập email
  await picker.click({ timeout: 5000 }).catch(() => {});
  await picker.fill("").catch(() => {});
  await page.waitForTimeout(300);
  await picker.fill(emailNorm).catch(async () => {
    await page.keyboard.type(emailNorm, { delay: 20 });
  });
  await page.waitForTimeout(1200);

  // ── Mở dropdown ────────────────────────────────────────────────────────────
  // NOTE: Chevron button có tabindex="-1" → Playwright .click() mặc định CÓ THỂ skip.
  // Phải dùng { force: true } hoặc JS click.

  // Khai báo allChevrons 1 lần để dùng chung cho cả phần mở dropdown và retry
  const allChevrons = modal.locator('button[aria-label="Show suggestions"]');
  const chevronCount = await allChevrons.count().catch(() => 0);

  // Bước 0: Sau khi fill email, Adobe có thể tự mở dropdown suggestions → kiểm tra trước
  const newUserOptionCheck = page.locator('[data-testid="new-user-row"]').first();
  const autoOpened = await newUserOptionCheck.isVisible({ timeout: 2000 }).catch(() => false);

  if (!autoOpened) {
    let dropdownOpened = false;

    if (slotIndex < chevronCount) {
      const chevronBtn = allChevrons.nth(slotIndex);
      const chevronVisible = await chevronBtn.isVisible({ timeout: 2000 }).catch(() => false);
      if (chevronVisible) {
        // Dùng force:true vì button có tabindex="-1"
        const clickOk = await chevronBtn.click({ timeout: 5000, force: true }).then(() => true).catch(() => false);
        if (clickOk) {
          await page.waitForTimeout(1200);
          dropdownOpened = true;
          logger.info("[adobe-v2] fillEmailInSlot: bấm chevron slot %d OK (force)", slotIndex);
        } else {
          // JS click fallback (bypass tabindex hoàn toàn)
          await chevronBtn.evaluate((el) => el.click()).catch(() => {});
          await page.waitForTimeout(1200);
          dropdownOpened = true;
          logger.info("[adobe-v2] fillEmailInSlot: bấm chevron slot %d via JS click", slotIndex);
        }
      }
    }

    // Cách 2: nếu vẫn chưa mở, thử click lại input + ArrowDown
    if (!dropdownOpened) {
      logger.info("[adobe-v2] fillEmailInSlot: chevron không bấm được, thử ArrowDown");
      await picker.click({ timeout: 3000 }).catch(() => {});
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(1000);
    }
  } else {
    logger.info("[adobe-v2] fillEmailInSlot: dropdown tự mở sau khi fill email");
  }

  // ── Chọn "Thêm làm người dùng mới" ────────────────────────────────────────
  // Retry tối đa 3 lần
  for (let attempt = 0; attempt < 3; attempt++) {
    // Option có data-testid="new-user-row" (theo docs)
    const newUserOption = page.locator('[data-testid="new-user-row"]').first();
    if (await newUserOption.isVisible({ timeout: 4000 }).catch(() => false)) {
      await newUserOption.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
      logger.info("[adobe-v2] fillEmailInSlot: chọn 'Thêm làm người dùng mới' cho %s (attempt %d)", emailNorm, attempt + 1);
      return true;
    }

    // Option text "người dùng mới" / "new user" (fallback text-based)
    const textOption = page.locator('[role="option"]').filter({
      hasText: /người dùng mới|new user/i,
    }).first();
    if (await textOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textOption.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
      logger.info("[adobe-v2] fillEmailInSlot: fallback text option cho %s", emailNorm);
      return true;
    }

    // Option theo data-key email (Adobe dùng email làm key khi đã nhận ra user mới)
    const emailOption = page.locator(`[role="option"][data-key="${emailNorm}"]`).first();
    if (await emailOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailOption.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
      logger.info("[adobe-v2] fillEmailInSlot: fallback data-key option cho %s", emailNorm);
      return true;
    }

    if (attempt < 2) {
      // Thử lại: click chevron hoặc ArrowDown lần nữa
      logger.info("[adobe-v2] fillEmailInSlot: option chưa hiện (attempt %d), thử mở lại dropdown", attempt + 1);
      if (slotIndex < chevronCount) {
        const chevronBtn = allChevrons.nth(slotIndex);
        await chevronBtn.click({ timeout: 3000 }).catch(() => {});
      } else {
        await picker.click({ timeout: 2000 }).catch(() => {});
        await page.keyboard.press("ArrowDown");
      }
      await page.waitForTimeout(1200);
    }
  }

  logger.warn("[adobe-v2] fillEmailInSlot: không thấy option nào cho %s", emailNorm);
  return false;
}

/**
 * Assign product cho user slot thứ `slotIndex` (0-based) trong modal.
 * Flow: bấm "+" (assignment-modal-open-button) → chọn product → "Áp dụng".
 */
async function assignProductForSlot(page, modal, slotIndex) {
  // Tìm tất cả nút "+" (assignment-modal-open-button) trong modal — mỗi user slot có 1 nút
  const allAssignBtns = modal.locator('button[data-testid="assignment-modal-open-button"]');
  const btnCount = await allAssignBtns.count().catch(() => 0);

  if (slotIndex >= btnCount) {
    logger.warn("[adobe-v2] assignProductForSlot: slotIndex=%d >= btnCount=%d", slotIndex, btnCount);
    return false;
  }

  const assignBtn = allAssignBtns.nth(slotIndex);

  // Chờ nút enabled (disabled khi chưa nhập email)
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const disabled = await assignBtn.isDisabled().catch(() => true);
    if (!disabled) break;
    await page.waitForTimeout(500);
  }

  const disabled = await assignBtn.isDisabled().catch(() => true);
  if (disabled) {
    logger.warn("[adobe-v2] assignProductForSlot: nút assign slot %d vẫn disabled", slotIndex);
    return false;
  }

  await assignBtn.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Chờ modal "Chọn sản phẩm" (product-assignment-modal) xuất hiện
  const productModal = page.locator('[data-testid="product-assignment-modal"]').first();
  if (!(await productModal.isVisible({ timeout: 10000 }).catch(() => false))) {
    // Fallback: tìm dialog có text "Chọn sản phẩm" hoặc "Select products"
    const fallbackModal = page.locator('[role="dialog"]').filter({
      hasText: /chọn sản phẩm|select products/i,
    }).first();
    if (!(await fallbackModal.isVisible({ timeout: 5000 }).catch(() => false))) {
      logger.warn("[adobe-v2] assignProductForSlot: không thấy modal Chọn sản phẩm");
      return false;
    }
  }

  // Chọn product: click vào row trong product-select-list
  const productList = page.locator('[data-testid="product-select-list"]').first();
  let productClicked = false;

  if (await productList.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Ưu tiên: click row chứa "Creative Cloud" (sản phẩm chính)
    const ccRow = productList.locator('[role="row"]').filter({
      hasText: /creative cloud/i,
    }).first();
    if (await ccRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ccRow.click({ timeout: 5000 }).catch(() => {});
      productClicked = true;
      logger.info("[adobe-v2] assignProductForSlot: chọn Creative Cloud row");
    } else {
      // Fallback: click row đầu tiên
      const firstRow = productList.locator('[role="row"]').first();
      if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstRow.click({ timeout: 5000 }).catch(() => {});
        productClicked = true;
        logger.info("[adobe-v2] assignProductForSlot: chọn row đầu tiên (fallback)");
      }
    }
  }

  if (!productClicked) {
    // Fallback: click checkbox trong product list
    const checkbox = page.locator('[data-testid="product-assignment-modal"] input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkbox.click({ force: true }).catch(() => {});
      productClicked = true;
    }
  }

  if (!productClicked) {
    logger.warn("[adobe-v2] assignProductForSlot: không chọn được product nào");
    // Vẫn thử bấm Áp dụng (có thể product đã được tự chọn)
  }

  await page.waitForTimeout(800);

  // Bấm "Áp dụng" trong modal product (cta-button bên trong product-assignment-modal)
  const applyBtn = page.locator('[data-testid="product-assignment-modal"] button[data-testid="cta-button"]').first();
  if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Chờ nút enabled
    const applyDeadline = Date.now() + 8000;
    while (Date.now() < applyDeadline) {
      const dis = await applyBtn.isDisabled().catch(() => true);
      if (!dis) break;
      await page.waitForTimeout(500);
    }
    await applyBtn.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    logger.info("[adobe-v2] assignProductForSlot: bấm Áp dụng xong");
    return true;
  }

  // Fallback: tìm nút text "Áp dụng" hoặc "Apply" trong dialog
  const applyFallback = page.locator('[role="dialog"]').filter({
    hasText: /chọn sản phẩm|select products/i,
  }).locator('button').filter({ hasText: /áp dụng|apply/i }).first();
  if (await applyFallback.isVisible({ timeout: 3000 }).catch(() => false)) {
    await applyFallback.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    return true;
  }

  logger.warn("[adobe-v2] assignProductForSlot: không bấm được Áp dụng");
  return false;
}

/**
 * Main: Add users vào org qua UI theo flow docs dòng 326.
 * Form có tối đa ~3 user slots. Nếu nhiều hơn → submit theo batch.
 */
async function addUsersToOrgViaUI(page, userEmails) {
  const emails = (userEmails || []).map((e) => String(e || "").trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) return { success: false, added: [], failed: [], error: "Danh sách email rỗng" };

  const added = [];
  const failed = [];
  const BATCH_SIZE = 3; // Form Adobe cho tối đa ~3 slot cùng lúc

  for (let batchStart = 0; batchStart < emails.length; batchStart += BATCH_SIZE) {
    const batch = emails.slice(batchStart, batchStart + BATCH_SIZE);
    logger.info("[adobe-v2] AddUsers: batch %d–%d / %d", batchStart + 1, batchStart + batch.length, emails.length);

    // 1. Bấm nút "Thêm người dùng"
    const clicked = await clickAddUserButton(page);
    if (!clicked) {
      batch.forEach((e) => failed.push(e));
      logger.warn("[adobe-v2] AddUsers: không bấm được nút Thêm người dùng");
      continue;
    }

    // 2. Chờ modal xuất hiện
    await page.waitForTimeout(1500);
    const modal = await waitForAddUserModal(page);
    if (!modal) {
      batch.forEach((e) => failed.push(e));
      logger.warn("[adobe-v2] AddUsers: modal add-users-to-org không xuất hiện");
      continue;
    }

    // 3. Điền email + assign product cho mỗi slot
    for (let i = 0; i < batch.length; i++) {
      const email = batch[i];
      logger.info("[adobe-v2] AddUsers: slot %d → %s", i, email);

      const filled = await fillEmailInSlot(page, modal, email, i);
      if (!filled) {
        logger.warn("[adobe-v2] AddUsers: không điền được email %s vào slot %d", email, i);
        failed.push(email);
        continue;
      }

      await page.waitForTimeout(800);

      const assigned = await assignProductForSlot(page, modal, i);
      if (!assigned) {
        logger.warn("[adobe-v2] AddUsers: không assign được product cho %s (slot %d) — vẫn tiếp tục", email, i);
        // Không push vào failed vì user vẫn có thể được add mà chưa có product
      }

      added.push(email);
    }

    // 4. Bấm "Lưu" (cta-button trong modal chính)
    if (added.length > 0 || batch.some((e) => !failed.includes(e))) {
      const saveBtn = modal.locator('button[data-testid="cta-button"]').first();
      let saved = false;

      if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Chờ nút enabled
        const saveDeadline = Date.now() + 10000;
        while (Date.now() < saveDeadline) {
          const dis = await saveBtn.isDisabled().catch(() => true);
          if (!dis) break;
          await page.waitForTimeout(500);
        }
        const dis = await saveBtn.isDisabled().catch(() => false);
        if (!dis) {
          await saveBtn.click({ timeout: 12000 }).catch(() => {});
          await page.waitForTimeout(2000);
          saved = true;
          logger.info("[adobe-v2] AddUsers: bấm Lưu xong (batch %d–%d)", batchStart + 1, batchStart + batch.length);
        }
      }

      if (!saved) {
        // Fallback: tìm nút text "Lưu" hoặc "Save"
        const saveFallback = modal.getByRole("button", { name: /^lưu$|^save$/i }).first();
        if (await saveFallback.isVisible({ timeout: 3000 }).catch(() => false)) {
          await saveFallback.click({ timeout: 12000 }).catch(() => {});
          await page.waitForTimeout(2000);
          saved = true;
        }
      }

      if (!saved) {
        logger.warn("[adobe-v2] AddUsers: không bấm được Lưu cho batch");
      }
    }

    // Chờ modal đóng và SPA sync
    await page.waitForTimeout(3000);

    // Nếu còn batch tiếp → reload trang users
    if (batchStart + BATCH_SIZE < emails.length) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }
  }

  return {
    success: added.length > 0,
    added,
    failed,
  };
}

// ─── Legacy helpers (backward-compatible exports) ───────────────────────────────

async function waitForUserRowByEmail(page, email, timeoutMs = 30000) {
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!emailNorm) return false;
  const emailRe = new RegExp(escapeRegex(emailNorm), "i");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = page.locator('[role="row"], table tr, tbody tr').filter({ hasText: emailRe }).first();
    if (await row.isVisible({ timeout: 1500 }).catch(() => false)) return true;
    await page.waitForTimeout(800);
  }
  return false;
}

async function selectUsersByEmails(page, emails) {
  const selected = [];
  for (const e of emails) {
    const emailNorm = String(e || "").trim().toLowerCase();
    if (!emailNorm) continue;
    const emailRe = new RegExp(escapeRegex(emailNorm), "i");
    const row = page.locator('[role="row"], table tr, tbody tr').filter({ hasText: emailRe }).first();
    const vis = await row.isVisible({ timeout: 2500 }).catch(() => false);
    if (!vis) continue;
    const cb = row.locator('input[type="checkbox"], [role="checkbox"]').first();
    if (await cb.isVisible({ timeout: 1500 }).catch(() => false)) {
      await cb.click({ force: true }).catch(() => {});
      selected.push(emailNorm);
    }
  }
  return selected;
}

async function openEditProductsModal(page) {
  const candidates = [
    () => page.getByRole("button", { name: /chỉnh sửa sản phẩm|edit products|products and user groups/i }).first(),
    () => page.locator('button:has-text("Chỉnh sửa sản phẩm")').first(),
    () => page.locator('[data-testid*="edit-products" i], [id*="edit-products" i]').first(),
  ];
  for (const getLocator of candidates) {
    try {
      const btn = getLocator();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        await btn.click({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const dlg = page.locator('#edit-products-user-groups-modal, [role="dialog"]').first();
        await dlg.waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
        return true;
      }
    } catch (_) {}
  }
  return false;
}

async function assignProductInModal(page, productNameRe) {
  const dialog = page.locator('#edit-products-user-groups-modal, [role="dialog"]').first();
  await dialog.waitFor({ state: "visible", timeout: 12000 }).catch(() => {});

  const productSection = dialog.locator('[data-testid="assignment-modal-section"]').filter({ hasText: /sản phẩm|products/i }).first();
  const openBtn = productSection.locator('button[data-testid="assignment-modal-open-button"]').first();
  if (await openBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openBtn.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  const option = page.locator('[role="option"], [role="listbox"] [role="option"], li[role="option"]').filter({ hasText: productNameRe }).first();
  if (await option.isVisible({ timeout: 12000 }).catch(() => false)) {
    await option.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
  } else {
    const first = page.locator('[role="option"]').first();
    if (await first.isVisible({ timeout: 3000 }).catch(() => false)) {
      await first.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
  }

  const saveBtn = dialog.locator('button[data-testid="cta-button"]').first();
  if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    const disabled = await saveBtn.isDisabled().catch(() => false);
    if (!disabled) {
      await saveBtn.click({ timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(2000);
      return true;
    }
  }
  const saveByText = dialog.getByRole("button", { name: /^lưu$|^save$/i }).first();
  if (await saveByText.isVisible({ timeout: 3000 }).catch(() => false)) {
    await saveByText.click({ timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

module.exports = {
  addUsersToOrgViaUI,
  selectUsersByEmails,
  openEditProductsModal,
  assignProductInModal,
  waitForUserRowByEmail,
};
