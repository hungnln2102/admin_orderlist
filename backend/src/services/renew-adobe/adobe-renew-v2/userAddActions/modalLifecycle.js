const logger = require("@/utils/logger");
const { dismissBlockingOverlays } = require("@/services/renew-adobe/adobe-renew-v2/dismissBlockingOverlays");
const { clickBestEffort, getUsersListUrlFromPage } = require("@/services/renew-adobe/adobe-renew-v2/userAddActions/shared");

async function dismissAddUsersPostSaveErrorToast(page, logPrefix) {
  for (let i = 0; i < 12; i++) {
    const toastRoot = page.locator('[data-testid="modal-error"]').first();
    if (await toastRoot.isVisible({ timeout: 500 }).catch(() => false)) {
      const msg = await toastRoot.locator(".spectrum-Toast-content").first().innerText().catch(() => "");
      logger.warn(
        "%s: toast lỗi sau Lưu (partial save có thể đã thành công): %s",
        logPrefix,
        (msg || "").trim().slice(0, 500)
      );
      const closeBtn = toastRoot.locator('button[aria-label="Close"]').first();
      if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await closeBtn.click({ timeout: 6000, force: true }).catch(() => {});
      } else {
        await toastRoot.locator(".spectrum-ClearButton").first().click({ timeout: 6000, force: true }).catch(() => {});
      }
      await page.waitForTimeout(600);
      return true;
    }
    await page.waitForTimeout(350);
  }
  return false;
}

async function reloadUsersListPageAfterAdd(page, logPrefix) {
  const usersUrl = getUsersListUrlFromPage(page);
  const reloaded = await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => false);
  if (!reloaded && usersUrl) {
    await page.goto(usersUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
  await dismissBlockingOverlays(page, { logPrefix });
  await page
    .locator('button[data-testid="add-users-btn"]')
    .first()
    .waitFor({ state: "visible", timeout: 25000 })
    .catch(() => {});
}

async function waitForAddUserModalGone(page, timeoutMs = 20000) {
  const modal = page.locator("#add-users-to-org-modal").first();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const v = await modal.isVisible().catch(() => false);
    if (!v) return;
    await page.waitForTimeout(400);
  }
}

async function waitForProductAssignmentModalClosed(page, timeoutMs = 20000) {
  const pm = page.locator('[data-testid="product-assignment-modal"]').first();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const vis = await pm.isVisible().catch(() => false);
    if (!vis) return true;
    await page.waitForTimeout(400);
  }
  logger.warn(
    "[adobe-v2] AddUsers: product-assignment-modal vẫn hiển thị sau %dms — vẫn thử bấm Lưu (có thể DOM chậm/mạng)",
    timeoutMs
  );
  return false;
}

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
      if (await btn.isVisible({ timeout: 3500 }).catch(() => false)) {
        const ok = await clickBestEffort(btn, 10000);
        if (ok) {
          await page.waitForTimeout(1200);
          return true;
        }
      }
    } catch (_) {}
  }
  return false;
}

async function waitForAddUserModal(page, timeoutMs = 45000) {
  const selectors = [
    "#add-users-to-org-modal",
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

module.exports = {
  dismissAddUsersPostSaveErrorToast,
  reloadUsersListPageAfterAdd,
  waitForAddUserModalGone,
  waitForProductAssignmentModalClosed,
  clickAddUserButton,
  waitForAddUserModal,
};
