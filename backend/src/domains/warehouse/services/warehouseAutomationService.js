const { db } = require("@/db");
const { TABLES } = require("@/db/tables");
const browserLauncherService = require("./browserLauncherService");

const openAccountBrowser = async (accountId, { serviceName, slotId, userAgent } = {}) => {
  if (!accountId) {
    throw new Error("ID tài khoản kho không được để trống!");
  }

  const account = await db(TABLES.PRODUCT_KEYS).where("id", accountId).first();
  if (!account) {
    throw new Error(`Không tìm thấy tài khoản kho với ID ${accountId}!`);
  }

  let customUrl = null;
  let resolvedServiceName = serviceName || "";

  // 1. Nếu có slotId, truy vấn để lấy login_url từ warehouse.product_names
  let verifiedSlotId = null;
  if (slotId) {
    const slot = await db(TABLES.STOCK_SERVICES)
      .where({ id: slotId, account_id: account.id })
      .first();
    if (slot && slot.name_id) {
      verifiedSlotId = slot.id;
      const pName = await db(TABLES.PRODUCT_NAMES).where("id", slot.name_id).first();
      if (pName) {
        customUrl = pName.login_url;
        resolvedServiceName = resolvedServiceName || pName.name;
      }
    }
  }

  // 2. Nếu chưa có customUrl, thử tìm theo resolvedServiceName
  if (!customUrl && resolvedServiceName) {
    const pName = await db(TABLES.PRODUCT_NAMES)
      .whereRaw("LOWER(name) = ?", [resolvedServiceName.trim().toLowerCase()])
      .first();
    if (pName && pName.login_url) {
      customUrl = pName.login_url;
    }
  }

  if (!customUrl) {
    throw new Error(`Dịch vụ ${resolvedServiceName || "này"} chưa có đường link đăng nhập. Vui lòng cấu hình trong Danh mục Kho Hàng trước khi mở trình duyệt.`);
  }

  const launchResult = await browserLauncherService.launchAccountBrowser({
    accountId: account.id,
    accountUsername: account.account_username,
    serviceName: resolvedServiceName,
    customUrl,
    userAgent,
  });

  if (verifiedSlotId) {
    await db(TABLES.STOCK_SERVICES)
      .where("id", verifiedSlotId)
      .update({
        session_is_authenticated: launchResult.data?.hasAuthenticatedSession === true,
        session_checked_at: new Date(),
        updated_at: new Date(),
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
