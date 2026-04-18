const { db } = require("../../db");
const logger = require("../../utils/logger");
const adobeRenewV2 = require("../../services/adobe-renew-v2");
const {
  lookupAndRecordIfNeeded,
} = require("../../services/userAccountMappingService");
const { TABLE, COLS, MAX_USERS_PER_ACCOUNT } = require("./accountTable");
const {
  ACTIVE_LICENSE_STATUSES,
  normalizeLicenseStatus,
} = require("./statusUtils");

function parseAlertConfig(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  return {};
}

function resolveAccountUserLimit(account) {
  const conf = parseAlertConfig(account?.[COLS.ALERT_CONFIG]);
  const n = Number(conf?.contractActiveLicenseCount || 0);
  if (Number.isFinite(n) && n > 0) return n;
  return MAX_USERS_PER_ACCOUNT;
}

function buildAvailableAccounts(accounts) {
  return accounts
    .filter((account) => {
      const licenseStatus = normalizeLicenseStatus(account[COLS.LICENSE_STATUS]);
      const isActive =
        account[COLS.IS_ACTIVE] !== false &&
        account[COLS.IS_ACTIVE] !== 0 &&
        account[COLS.IS_ACTIVE] !== "0";

      return isActive && ACTIVE_LICENSE_STATUSES.has(licenseStatus);
    })
    .map((account) => ({
      ...account,
      currentCount: Math.max(0, parseInt(account[COLS.USER_COUNT], 10) || 0),
      userLimit: resolveAccountUserLimit(account),
    }))
    .filter((account) => account.currentCount < account.userLimit)
    .sort((a, b) => {
      const slotsA = a.userLimit - a.currentCount;
      const slotsB = b.userLimit - b.currentCount;
      return slotsA - slotsB;
    });
}

async function assignUserToAvailableAccount(userEmail) {
  const normalizedEmail = String(userEmail || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Thiếu email.");
  }

  const accounts = await db(TABLE)
    .select(
      COLS.ID,
      COLS.EMAIL,
      COLS.PASSWORD_ENC,
      COLS.ORG_NAME,
      COLS.LICENSE_STATUS,
      COLS.USER_COUNT,
      COLS.ALERT_CONFIG,
      ...(COLS.OTP_SOURCE ? [COLS.OTP_SOURCE] : []),
      COLS.MAIL_BACKUP_ID,
      COLS.IS_ACTIVE
    )
    .orderBy(COLS.ID, "asc");

  const available = buildAvailableAccounts(accounts);
  if (available.length === 0) {
    throw new Error("Không có tài khoản nào còn gói và còn slot.");
  }

  const target = available[0];
  const accountId = target[COLS.ID];
  const accountEmail = target[COLS.EMAIL];
  const accountPassword = target[COLS.PASSWORD_ENC] || "";
  const mailBackupId =
    target[COLS.MAIL_BACKUP_ID] != null
      ? Number(target[COLS.MAIL_BACKUP_ID])
      : null;
  const savedCookies = target[COLS.ALERT_CONFIG]?.cookies || [];
  const otpSource =
    COLS.OTP_SOURCE && target[COLS.OTP_SOURCE]
      ? String(target[COLS.OTP_SOURCE]).trim().toLowerCase()
      : "imap";

  logger.info(
    "[renew-adobe] assignUserToAvailableAccount: email=%s → account=%s",
    normalizedEmail,
    accountId
  );

  const v2 = await adobeRenewV2.addUsersWithProductV2(
    accountEmail,
    accountPassword,
    [normalizedEmail],
    {
      savedCookies,
      mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
      otpSource,
    }
  );

  if (!v2.success) {
    throw new Error(v2.error || "addUsersWithProductV2 thất bại");
  }

  const updatePayload = {
    [COLS.USER_COUNT]: v2.userCount ?? (v2.manageTeamMembers?.length ?? 0),
    [COLS.USERS_SNAPSHOT]: JSON.stringify(v2.manageTeamMembers || []),
  };
  if (v2.savedCookies) {
    updatePayload[COLS.ALERT_CONFIG] = v2.savedCookies;
  }

  await db(TABLE).where(COLS.ID, accountId).update(updatePayload);

  const addedEmails =
    v2.addResult?.added?.length > 0 ? v2.addResult.added : [normalizedEmail];
  await lookupAndRecordIfNeeded(addedEmails, accountId).catch((error) => {
    logger.warn("[renew-adobe] assignUserToAvailableAccount mapping failed", {
      email: normalizedEmail,
      accountId,
      error: error.message,
    });
  });

  return {
    accountId,
    accountEmail,
    profileName: target[COLS.ORG_NAME] ?? null,
    userCount: updatePayload[COLS.USER_COUNT],
  };
}

/**
 * Một vòng Fix All: đọc lại DB → chọn tài khoản **gần đầy nhất** (ít slot trống nhất,
 * sort giống buildAvailableAccounts) → lấy tối đa min(slot_trống, số email) user →
 * một lần gọi addUsersWithProductV2 (batch).
 */
async function fixUsersOneRoundTightest(userEmailsRaw) {
  const remainingDistinct = [
    ...new Set(
      (Array.isArray(userEmailsRaw) ? userEmailsRaw : [])
        .map((e) => String(e || "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];

  if (remainingDistinct.length === 0) {
    return {
      success: true,
      added_count: 0,
      remaining_emails: [],
      round: null,
    };
  }

  const accounts = await db(TABLE)
    .select(
      COLS.ID,
      COLS.EMAIL,
      COLS.PASSWORD_ENC,
      COLS.ORG_NAME,
      COLS.LICENSE_STATUS,
      COLS.USER_COUNT,
      COLS.ALERT_CONFIG,
      ...(COLS.OTP_SOURCE ? [COLS.OTP_SOURCE] : []),
      COLS.MAIL_BACKUP_ID,
      COLS.IS_ACTIVE
    )
    .orderBy(COLS.ID, "asc");

  const available = buildAvailableAccounts(accounts);
  if (available.length === 0) {
    return {
      success: false,
      error: "Không có tài khoản nào còn gói và còn slot.",
      added_count: 0,
      remaining_emails: remainingDistinct,
      round: null,
    };
  }

  const target = available[0];
  const accountId = target[COLS.ID];
  const accountEmail = target[COLS.EMAIL];
  const accountPassword = target[COLS.PASSWORD_ENC] || "";
  const slotsLeft = Math.max(0, target.userLimit - target.currentCount);
  const take = Math.min(slotsLeft, remainingDistinct.length);
  const chunk = remainingDistinct.slice(0, take);
  const stillRemaining = remainingDistinct.slice(take);

  const mailBackupId =
    target[COLS.MAIL_BACKUP_ID] != null
      ? Number(target[COLS.MAIL_BACKUP_ID])
      : null;
  const savedCookies = target[COLS.ALERT_CONFIG]?.cookies || [];
  const otpSource =
    COLS.OTP_SOURCE && target[COLS.OTP_SOURCE]
      ? String(target[COLS.OTP_SOURCE]).trim().toLowerCase()
      : "imap";

  logger.info(
    "[renew-adobe] fixUsersOneRoundTightest: account=%s slotsLeft=%s batchSize=%s still=%s",
    accountId,
    slotsLeft,
    chunk.length,
    stillRemaining.length
  );

  try {
    const v2 = await adobeRenewV2.addUsersWithProductV2(
      accountEmail,
      accountPassword,
      chunk,
      {
        savedCookies,
        mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
        otpSource,
      }
    );

    if (!v2.success) {
      return {
        success: false,
        error: v2.error || "addUsersWithProductV2 thất bại",
        added_count: 0,
        remaining_emails: remainingDistinct,
        round: null,
      };
    }

    const updatePayload = {
      [COLS.USER_COUNT]: v2.userCount ?? (v2.manageTeamMembers?.length ?? 0),
      [COLS.USERS_SNAPSHOT]: JSON.stringify(v2.manageTeamMembers || []),
    };
    if (v2.savedCookies) {
      updatePayload[COLS.ALERT_CONFIG] = v2.savedCookies;
    }
    await db(TABLE).where(COLS.ID, accountId).update(updatePayload);

    const addedEmails =
      v2.addResult?.added?.length > 0 ? v2.addResult.added : chunk;
    await lookupAndRecordIfNeeded(addedEmails, accountId).catch((error) => {
      logger.warn("[renew-adobe] fixUsersOneRoundTightest mapping failed", {
        accountId,
        error: error.message,
      });
    });

    return {
      success: true,
      added_count: addedEmails.length,
      remaining_emails: stillRemaining,
      round: {
        accountId,
        accountEmail,
        emails: chunk,
      },
    };
  } catch (err) {
    logger.error("[renew-adobe] fixUsersOneRoundTightest failed", {
      accountId,
      error: err.message,
    });
    return {
      success: false,
      error: err.message || "Lỗi khi thêm user batch.",
      added_count: 0,
      remaining_emails: remainingDistinct,
      round: null,
    };
  }
}

module.exports = {
  buildAvailableAccounts,
  assignUserToAvailableAccount,
  fixUsersOneRoundTightest,
};
