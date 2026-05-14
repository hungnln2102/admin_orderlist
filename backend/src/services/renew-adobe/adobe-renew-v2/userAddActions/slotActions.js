const logger = require("../../../../utils/logger");
const { dismissBlockingOverlays } = require("../dismissBlockingOverlays");
const { clickBestEffort, waitForAssignButtonEnabled } = require("./shared");

async function fillEmailInSlotV2(page, modal, email, slotIndex) {
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!emailNorm) return false;

  const allPickers = modal.locator('input[data-testid="user-picker"]');
  const pickerCount = await allPickers.count().catch(() => 0);
  if (slotIndex >= pickerCount) {
    logger.warn("[adobe-v2] fillEmailInSlotV2: slotIndex=%d >= pickerCount=%d", slotIndex, pickerCount);
    return false;
  }

  const picker = allPickers.nth(slotIndex);
  if (!(await picker.isVisible({ timeout: 5000 }).catch(() => false))) {
    logger.warn("[adobe-v2] fillEmailInSlotV2: picker slot %d not visible", slotIndex);
    return false;
  }

  await picker.click({ timeout: 5000 }).catch(() => {});
  await picker.fill("").catch(() => {});
  await page.waitForTimeout(250);
  await picker.fill(emailNorm).catch(async () => {
    await page.keyboard.type(emailNorm, { delay: 20 });
  });
  await page.waitForTimeout(1000);

  const allChevrons = modal.locator(
    'button[aria-label="Show suggestions"]:not([disabled]), button[aria-label="Hiển thị đề xuất"]:not([disabled]), button[aria-label*="suggestion" i]:not([disabled])'
  );
  const chevronCount = await allChevrons.count().catch(() => 0);
  const optionRegex =
    /add as a new user|new user|thêm làm người dùng mới|người dùng mới|làm người dùng mới/i;

  const getOptionCandidates = () => [
    page.locator('[data-testid="new-user-row"]').filter({ hasText: optionRegex }).first(),
    page.locator('[role="option"], [role="menuitem"]').filter({ hasText: optionRegex }).first(),
    page.locator("button, [role=\"button\"], li, div").filter({ hasText: optionRegex }).first(),
    page.locator(`[role="option"][data-key="${emailNorm}"]`).first(),
    page.getByText(optionRegex).first(),
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    let dropdownOpened = false;

    for (const option of getOptionCandidates()) {
      const visible = await option.isVisible({ timeout: 600 }).catch(() => false);
      if (visible) {
        dropdownOpened = true;
        break;
      }
    }

    if (!dropdownOpened) {
      if (slotIndex < chevronCount) {
        const chevronBtn = allChevrons.nth(slotIndex);
        const chevronVisible = await chevronBtn.isVisible({ timeout: 1200 }).catch(() => false);
        if (chevronVisible) {
          dropdownOpened = await clickBestEffort(chevronBtn, 4000);
          if (dropdownOpened) {
            await page.waitForTimeout(900);
          }
        }
      }

      if (!dropdownOpened) {
        await picker.click({ timeout: 2500 }).catch(() => {});
        await page.keyboard.press("ArrowDown").catch(() => {});
        await page.waitForTimeout(700);
      }
    }

    let picked = false;
    for (const option of getOptionCandidates()) {
      const visible = await option.isVisible({ timeout: 1200 }).catch(() => false);
      if (!visible) {
        continue;
      }

      picked = await clickBestEffort(option, 4000);
      if (picked) {
        await page.waitForTimeout(1400);
        break;
      }
    }

    if (!picked) {
      await picker.click({ timeout: 2500 }).catch(() => {});
      await page.keyboard.press("ArrowDown").catch(() => {});
      await page.waitForTimeout(150);
      await page.keyboard.press("Enter").catch(() => {});
      await page.waitForTimeout(1200);
    }

    await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] fillEmailInSlotV2" });

    const slotReady = await waitForAssignButtonEnabled(modal, slotIndex, 18_000);
    if (slotReady) {
      logger.info(
        "[adobe-v2] fillEmailInSlotV2: selected new user for %s (attempt %d)",
        emailNorm,
        attempt + 1
      );
      return true;
    }

    logger.warn(
      "[adobe-v2] fillEmailInSlotV2: assign button still disabled for %s (attempt %d)",
      emailNorm,
      attempt + 1
    );
    await page.waitForTimeout(900);
  }

  return false;
}

async function assignProductForSlot(page, modal, slotIndex) {
  const allAssignBtns = modal.locator('button[data-testid="assignment-modal-open-button"]');
  const btnCount = await allAssignBtns.count().catch(() => 0);

  if (slotIndex >= btnCount) {
    logger.warn("[adobe-v2] assignProductForSlot: slotIndex=%d >= btnCount=%d", slotIndex, btnCount);
    return false;
  }

  const assignBtn = allAssignBtns.nth(slotIndex);
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

  const productModal = page.locator('[data-testid="product-assignment-modal"]').first();
  if (!(await productModal.isVisible({ timeout: 10000 }).catch(() => false))) {
    const fallbackModal = page.locator('[role="dialog"]').filter({
      hasText: /chọn sản phẩm|select products/i,
    }).first();
    if (!(await fallbackModal.isVisible({ timeout: 5000 }).catch(() => false))) {
      logger.warn("[adobe-v2] assignProductForSlot: không thấy modal Chọn sản phẩm");
      return false;
    }
  }

  const productList = page.locator('[data-testid="product-select-list"]').first();
  let productClicked = false;

  if (await productList.isVisible({ timeout: 5000 }).catch(() => false)) {
    const ccRow = productList.locator('[role="row"]').filter({
      hasText: /creative cloud/i,
    }).first();
    if (await ccRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ccRow.click({ timeout: 5000 }).catch(() => {});
      productClicked = true;
      logger.info("[adobe-v2] assignProductForSlot: chọn Creative Cloud row");
    } else {
      const firstRow = productList.locator('[role="row"]').first();
      if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstRow.click({ timeout: 5000 }).catch(() => {});
        productClicked = true;
        logger.info("[adobe-v2] assignProductForSlot: chọn row đầu tiên (fallback)");
      }
    }
  }

  if (!productClicked) {
    const checkbox = page.locator('[data-testid="product-assignment-modal"] input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkbox.click({ force: true }).catch(() => {});
      productClicked = true;
    }
  }

  if (!productClicked) {
    logger.warn("[adobe-v2] assignProductForSlot: không chọn được product nào");
  }

  await page.waitForTimeout(800);

  const applyBtn = page.locator('[data-testid="product-assignment-modal"] button[data-testid="cta-button"]').first();
  if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
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

  const applyFallback = page.locator('[role="dialog"]').filter({
    hasText: /chọn sản phẩm|select products/i,
  }).locator("button").filter({ hasText: /áp dụng|apply/i }).first();
  if (await applyFallback.isVisible({ timeout: 3000 }).catch(() => false)) {
    await applyFallback.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    return true;
  }

  logger.warn("[adobe-v2] assignProductForSlot: không bấm được Áp dụng");
  return false;
}

module.exports = {
  fillEmailInSlotV2,
  assignProductForSlot,
};
