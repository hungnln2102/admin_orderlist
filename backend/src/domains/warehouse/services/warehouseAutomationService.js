const { db } = require("@/db");
const { TABLES, COLS } = require("@/db/tables");
const browserLauncherService = require("./browserLauncherService");

const { ACCOUNTS: ACCOUNT, ACCOUNT_SLOTS: SLOT, PRODUCT_NAMES: CATALOG } = COLS;

const openAccountBrowser = async (accountId, { serviceName, slotId, userAgent, openConfiguredUrl } = {}) => {
  if (!accountId) {
    throw new Error("ID tài khoản kho không được để trống!");
  }

  const account = await db(TABLES.ACCOUNTS).where(ACCOUNT.ID, accountId).first();
  if (!account) {
    throw new Error(`Không tìm thấy tài khoản kho với ID ${accountId}!`);
  }

  let customUrl = null;
  let resolvedServiceName = serviceName || "";

  // 1. Nếu có slotId, truy vấn để lấy login_url từ warehouse.product_names
  let verifiedSlotId = null;
  if (slotId) {
    const slot = await db(TABLES.ACCOUNT_SLOTS)
      .where({ [SLOT.ID]: slotId, [SLOT.ACCOUNT_ID]: account[ACCOUNT.ID] })
      .first();
    if (slot && slot[SLOT.NAME_ID]) {
      verifiedSlotId = slot[SLOT.ID];
      const pName = await db(TABLES.PRODUCT_NAMES).where(CATALOG.ID, slot[SLOT.NAME_ID]).first();
      if (pName) {
        customUrl = pName[CATALOG.LOGIN_URL];
        resolvedServiceName = resolvedServiceName || pName[CATALOG.NAME];
      }
    }
  }

  // 2. Nếu chưa có customUrl, thử tìm theo resolvedServiceName
  if (!customUrl && resolvedServiceName) {
    const pName = await db(TABLES.PRODUCT_NAMES)
      .whereRaw("LOWER(??) = ?", [CATALOG.NAME, resolvedServiceName.trim().toLowerCase()])
      .first();
    if (pName && pName[CATALOG.LOGIN_URL]) {
      customUrl = pName[CATALOG.LOGIN_URL];
    }
  }

  if (!customUrl) {
    throw new Error(`Dịch vụ ${resolvedServiceName || "này"} chưa có đường link đăng nhập. Vui lòng cấu hình trong Danh mục Kho Hàng trước khi mở trình duyệt.`);
  }

  const launchResult = await browserLauncherService.launchAccountBrowser({
    accountId: account[ACCOUNT.ID],
    accountUsername: account[ACCOUNT.ACCOUNT_USERNAME],
    serviceName: resolvedServiceName,
    customUrl,
    userAgent,
    openConfiguredUrl,
  });

  if (verifiedSlotId && launchResult.data?.sessionVerified === true) {
    await db(TABLES.ACCOUNT_SLOTS)
      .where(SLOT.ID, verifiedSlotId)
      .update({
        [SLOT.SESSION_IS_AUTHENTICATED]: launchResult.data.hasAuthenticatedSession === true,
        [SLOT.SESSION_CHECKED_AT]: new Date(),
        [SLOT.UPDATED_AT]: new Date(),
      });
  }

  return launchResult;
};

/**
 * Cập nhật thông tin dịch vụ slot (password, backup_email, two_fa, expires_at, status, service_note)
 * và optionally cập nhật account_username của tài khoản mẹ
 */

const closeAllBrowserContexts = () => browserLauncherService.closeAllBrowserContexts();

module.exports = { openAccountBrowser, closeAllBrowserContexts };
