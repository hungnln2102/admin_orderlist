const logger = require("../../../../utils/logger");
const { dismissBlockingOverlays } = require("../dismissBlockingOverlays");
const { getUsersListUrlFromPage } = require("./shared");
const {
  dismissAddUsersPostSaveErrorToast,
  reloadUsersListPageAfterAdd,
  waitForAddUserModalGone,
  waitForProductAssignmentModalClosed,
  clickAddUserButton,
  waitForAddUserModal,
} = require("./modalLifecycle");
const { fillEmailInSlotV2, assignProductForSlot } = require("./slotActions");

async function addUsersToOrgViaUI(page, userEmails) {
  const emails = (userEmails || []).map((e) => String(e || "").trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) return { success: false, added: [], failed: [], error: "Danh sách email rỗng" };

  const added = [];
  const failed = [];
  const BATCH_SIZE = 3;

  let emailIdx = 0;
  while (emailIdx < emails.length) {
    const planned = Math.min(BATCH_SIZE, emails.length - emailIdx);
    const batchSlice = emails.slice(emailIdx, emailIdx + planned);
    logger.info(
      "[adobe-v2] AddUsers: batch index %d–%d / %d (planned %d)",
      emailIdx,
      emailIdx + batchSlice.length - 1,
      emails.length,
      planned
    );

    await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] AddUsers" });

    let clicked = await clickAddUserButton(page);
    if (!clicked) {
      const usersUrl = getUsersListUrlFromPage(page);
      if (usersUrl) {
        logger.info("[adobe-v2] AddUsers: không bấm được Thêm người dùng → goto %s rồi thử lại", usersUrl);
        await page.goto(usersUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] AddUsers" });
        const addBtn = page.locator('button[data-testid="add-users-btn"]').first();
        await addBtn.waitFor({ state: "visible", timeout: 25000 }).catch(() => {});
        clicked = await clickAddUserButton(page);
      }
    }
    if (!clicked) {
      batchSlice.forEach((e) => failed.push(e));
      logger.warn("[adobe-v2] AddUsers: không bấm được nút Thêm người dùng");
      emailIdx += planned;
      continue;
    }

    await page.waitForTimeout(1500);
    const modal = await waitForAddUserModal(page);
    if (!modal) {
      batchSlice.forEach((e) => failed.push(e));
      logger.warn("[adobe-v2] AddUsers: modal add-users-to-org không xuất hiện");
      emailIdx += planned;
      continue;
    }

    const pickerLocator = modal.locator('input[data-testid="user-picker"]');
    let pickerCount = await pickerLocator.count().catch(() => 0);
    const pickerWaitDeadline = Date.now() + 10000;
    while (pickerCount < planned && pickerCount < BATCH_SIZE && Date.now() < pickerWaitDeadline) {
      await page.waitForTimeout(400);
      pickerCount = await pickerLocator.count().catch(() => 0);
    }
    if (pickerCount === 0) {
      batchSlice.forEach((e) => failed.push(e));
      logger.warn("[adobe-v2] AddUsers: không thấy user-picker trong modal");
      emailIdx += planned;
      continue;
    }

    const chunkLen = Math.min(planned, pickerCount);
    const batch = batchSlice.slice(0, chunkLen);
    if (chunkLen < planned) {
      logger.info(
        "[adobe-v2] AddUsers: modal có %d user-picker — điền %d email; %d email còn lại sẽ xử lý ở lần mở modal tiếp",
        pickerCount,
        chunkLen,
        planned - chunkLen
      );
    }

    const batchAdded = [];

    for (let i = 0; i < batch.length; i++) {
      const email = batch[i];
      logger.info("[adobe-v2] AddUsers: slot %d → %s", i, email);

      const filled = await fillEmailInSlotV2(page, modal, email, i);
      if (!filled) {
        logger.warn("[adobe-v2] AddUsers: không điền được email %s vào slot %d", email, i);
        failed.push(email);
        continue;
      }

      await page.waitForTimeout(800);

      const assigned = await assignProductForSlot(page, modal, i);
      if (!assigned) {
        logger.warn("[adobe-v2] AddUsers: không assign được product cho %s (slot %d) — vẫn tiếp tục", email, i);
      }

      batchAdded.push(email);
      added.push(email);
    }

    if (batchAdded.length > 0) {
      await waitForProductAssignmentModalClosed(page);
      logger.info("[adobe-v2] AddUsers: chuẩn bị bấm Lưu (batch %d email)", batchAdded.length);

      const mainAddModal = page.locator("#add-users-to-org-modal").first();
      const saveBtn = mainAddModal.locator('button[data-testid="cta-button"]').first();
      let saved = false;

      if (await saveBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
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
          logger.info("[adobe-v2] AddUsers: bấm Lưu xong (%d email)", batchAdded.length);
        }
      }

      if (!saved) {
        const saveFallback = mainAddModal.getByRole("button", { name: /^lưu$|^save$/i }).first();
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

    emailIdx += chunkLen;

    await page.waitForTimeout(1200);
    const hadPostSaveErrorToast = await dismissAddUsersPostSaveErrorToast(page, "[adobe-v2] AddUsers");
    if (hadPostSaveErrorToast) {
      logger.info("[adobe-v2] AddUsers: có toast lỗi sau Lưu → reload /users để đồng bộ danh sách");
      await reloadUsersListPageAfterAdd(page, "[adobe-v2] AddUsers");
    } else {
      await waitForAddUserModalGone(page);
    }
    await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] AddUsers" });
    await page.waitForTimeout(800);

    if (emailIdx < emails.length) {
      await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] AddUsers" });
      const reloaded = await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => false);
      if (!reloaded) {
        const usersUrl = getUsersListUrlFromPage(page);
        if (usersUrl) {
          await page.goto(usersUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
        }
      }
      await page.waitForTimeout(2000);
      await dismissBlockingOverlays(page, { logPrefix: "[adobe-v2] AddUsers" });
      const addBtn = page.locator('button[data-testid="add-users-btn"]').first();
      await addBtn.waitFor({ state: "visible", timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  return {
    success: added.length > 0,
    added,
    failed,
  };
}

module.exports = {
  addUsersToOrgViaUI,
};
