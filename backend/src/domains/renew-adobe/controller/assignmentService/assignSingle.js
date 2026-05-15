const { db } = require("../../../../db");
const logger = require("../../../../utils/logger");
const {
  getAssignedAdobeAccountIdForUserEmail,
} = require("../../../../services/userAccountMappingService");
const {
  upsertRenewAdobeOrderUserTrackingForAccount,
} = require("../../../../services/renew-adobe/orderUserTrackingService");
const {
  TABLE,
  COLS,
  buildAvailableAccounts,
  getAccountsBaseSelectCols,
} = require("./availableAccounts");
const {
  isAdobeSlotFullAddError,
  addUsersToAdobe,
  persistAfterAddSuccess,
} = require("./helpers");

async function assignUserToAvailableAccount(userEmail) {
  const normalizedEmail = String(userEmail || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Thiếu email.");
  }

  const existingAdobeId = await getAssignedAdobeAccountIdForUserEmail(normalizedEmail);
  if (existingAdobeId != null) {
    const accRow = await db(TABLE).where(COLS.ID, existingAdobeId).first();
    await upsertRenewAdobeOrderUserTrackingForAccount(existingAdobeId).catch((error) => {
      logger.warn("[renew-adobe] assignUserToAvailableAccount tracking refresh failed", {
        accountId: existingAdobeId,
        error: error.message,
      });
    });
    return {
      accountId: existingAdobeId,
      accountEmail: accRow?.[COLS.EMAIL] ?? "",
      profileName: accRow?.[COLS.ORG_NAME] ?? null,
      userCount: accRow?.[COLS.USER_COUNT],
      alreadyOnAdobe: true,
    };
  }

  const accounts = await db(TABLE)
    .select(...getAccountsBaseSelectCols())
    .orderBy(COLS.ID, "asc");
  const available = await buildAvailableAccounts(accounts);
  if (available.length === 0) {
    throw new Error("Không có tài khoản nào còn gói và còn slot.");
  }

  let lastAddError = null;
  for (let attempt = 0; attempt < available.length; attempt += 1) {
    const target = available[attempt];
    const accountId = target[COLS.ID];
    const accountEmail = target[COLS.EMAIL];

    logger.info(
      "[renew-adobe] assignUserToAvailableAccount: email=%s → account=%s (thử %d/%d)",
      normalizedEmail,
      accountId,
      attempt + 1,
      available.length
    );

    let v2;
    try {
      v2 = await addUsersToAdobe({ target, emails: [normalizedEmail] });
    } catch (addErr) {
      lastAddError = addErr?.message || String(addErr);
      logger.warn(
        "[renew-adobe] assignUserToAvailableAccount: addUsersWithProductV2 ném lỗi (id=%s), thử tài khoản khác: %s",
        accountId,
        lastAddError
      );
      continue;
    }

    if (!v2.success) {
      lastAddError = v2.error || "addUsersWithProductV2 thất bại";
      if (isAdobeSlotFullAddError(lastAddError)) {
        logger.warn(
          "[renew-adobe] assignUserToAvailableAccount: Adobe đầy slot (id=%s), thử tài khoản khác: %s",
          accountId,
          lastAddError
        );
        continue;
      }
      throw new Error(lastAddError);
    }

    const updatePayload = await persistAfterAddSuccess({
      context: "assignUserToAvailableAccount",
      target,
      accountId,
      fallbackAddedEmails: [normalizedEmail],
      v2,
    });

    return {
      accountId,
      accountEmail,
      profileName: target[COLS.ORG_NAME] ?? null,
      userCount: updatePayload[COLS.USER_COUNT],
    };
  }

  throw new Error(
    lastAddError ||
      "Không còn tài khoản thử thêm: mọi tài khoản còn slot theo DB đều báo đầy trên Adobe (nên chạy Check hoặc dọn user ngoài Admin Console)."
  );
}

module.exports = {
  assignUserToAvailableAccount,
};
