const { db } = require("../../db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const logger = require("../../utils/logger");
const adobeRenewV2 = require("../../services/adobe-renew-v2");
const { TABLE, COLS } = require("./accountTable");

async function runCheckForAccountId(id) {
  logger.info(
    "[renew-adobe] DEBUG: typeof adobeRenewV2.checkAccount = %s",
    typeof adobeRenewV2.checkAccount
  );
  logger.info(
    "[renew-adobe] DEBUG: adobeRenewV2 keys = %s",
    Object.keys(adobeRenewV2).join(", ")
  );

  const account = await db(TABLE).where(COLS.ID, id).first();
  if (!account) {
    throw new Error("Không tìm thấy tài khoản.");
  }

  const email = account[COLS.EMAIL];
  const password = account[COLS.PASSWORD_ENC] || "";
  if (!email || !password) {
    throw new Error("Thiếu email hoặc password_enc.");
  }

  const mailBackupId =
    account[COLS.MAIL_BACKUP_ID] != null
      ? Number(account[COLS.MAIL_BACKUP_ID])
      : null;
  logger.info("[renew-adobe] Check account", { id, email });

  const existingUrlAccess =
    (COLS.URL_ACCESS &&
      account[COLS.URL_ACCESS] &&
      String(account[COLS.URL_ACCESS]).trim()) ||
    null;
  const rawOrgName =
    COLS.ORG_NAME && account[COLS.ORG_NAME]
      ? String(account[COLS.ORG_NAME]).trim()
      : "";
  const existingOrgName =
    rawOrgName && rawOrgName !== "-" ? rawOrgName : undefined;

  const result = await adobeRenewV2.checkAccount(email, password, {
    savedCookiesFromDb: COLS.ALERT_CONFIG ? account[COLS.ALERT_CONFIG] : null,
    mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
    existingUrlAccess,
    existingOrgName,
  });

  if (!result.success) {
    if (result._stack) {
      logger.error(
        "[renew-adobe] checkAccount thất bại với stack:\n%s",
        result._stack
      );
    }
    throw new Error(result.error || "Check thất bại.");
  }

  const scrapedData = result.scrapedData;
  const updatePayload = {
    [COLS.ORG_NAME]: scrapedData.orgName ?? null,
    [COLS.USER_COUNT]: Number.isFinite(scrapedData.userCount)
      ? scrapedData.userCount
      : 0,
    [COLS.LICENSE_STATUS]: scrapedData.licenseStatus ?? "unknown",
    [COLS.LAST_CHECKED]: new Date(),
  };

  if (
    scrapedData.manageTeamMembers &&
    Array.isArray(scrapedData.manageTeamMembers)
  ) {
    updatePayload[COLS.USERS_SNAPSHOT] = JSON.stringify(
      scrapedData.manageTeamMembers
    );
  }
  if (scrapedData.urlAccess && COLS.URL_ACCESS) {
    updatePayload[COLS.URL_ACCESS] = scrapedData.urlAccess;
  }
  if (COLS.ALERT_CONFIG && result.savedCookies) {
    updatePayload[COLS.ALERT_CONFIG] = result.savedCookies;
  }

  await db(TABLE).where(COLS.ID, id).update(updatePayload);
  logger.info("[renew-adobe] Check xong — đã cập nhật DB", {
    id,
    license_status: scrapedData.licenseStatus,
  });

  if (
    scrapedData.licenseStatus &&
    scrapedData.licenseStatus.toLowerCase() === "expired"
  ) {
    const userEmails = (scrapedData.manageTeamMembers || [])
      .map((user) => user.email)
      .filter(Boolean);

    if (userEmails.length > 0) {
      logger.info(
        "[renew-adobe] Account %s expired → auto-delete %s users",
        id,
        userEmails.length
      );
      try {
        await adobeRenewV2.autoDeleteUsers(email, password, userEmails, {
          savedCookiesFromDb: result.savedCookies || null,
          mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
        });
        await db(TABLE).where(COLS.ID, id).update({
          [COLS.USERS_SNAPSHOT]: JSON.stringify([]),
          [COLS.USER_COUNT]: 0,
        });

        const mappingSchema = RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING;
        const mappingTable = tableName(
          mappingSchema.TABLE,
          SCHEMA_RENEW_ADOBE
        );
        const mappingCols = mappingSchema.COLS;
        const deletedLower = userEmails.map((emailValue) =>
          emailValue.toLowerCase()
        );

        try {
          const updated = await db(mappingTable)
            .whereIn(
              db.raw(`LOWER(${mappingCols.USER_EMAIL})`),
              deletedLower
            )
            .andWhere(mappingCols.ADOBE_ACCOUNT_ID, id)
            .update({
              [mappingCols.PRODUCT]: false,
              [mappingCols.UPDATED_AT]: new Date(),
            });
          logger.info(
            "[renew-adobe] Account %s: user_account_mapping updated=%d rows (product→false)",
            id,
            updated
          );
        } catch (mappingError) {
          logger.error(
            "[renew-adobe] Account %s: sync mapping failed: %s",
            id,
            mappingError.message
          );
        }

        logger.info("[renew-adobe] Auto-delete xong cho account %s", id);
      } catch (deleteError) {
        logger.error(
          "[renew-adobe] Auto-delete failed cho account %s: %s",
          id,
          deleteError.message
        );
      }
    }
  }
}

const runCheck = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const marker = `check-v2-${Date.now()}`;

  logger.info("[renew-adobe] runCheck ENTER id=%s marker=%s", id, marker);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "ID không hợp lệ.", _marker: marker });
  }

  try {
    await runCheckForAccountId(id);
    const account = await db(TABLE).where(COLS.ID, id).first();

    return res.json({
      success: true,
      message: "Check thành công.",
      _marker: marker,
      org_name: account?.[COLS.ORG_NAME] ?? null,
      user_count: account?.[COLS.USER_COUNT] ?? 0,
      license_status: account?.[COLS.LICENSE_STATUS] ?? "unknown",
    });
  } catch (err) {
    logger.error("[renew-adobe] Run check failed marker=%s", marker, {
      id,
      error: err.message,
      stack: err.stack,
    });
    if (err.message === "Không tìm thấy tài khoản.") {
      return res.status(404).json({ error: err.message, _marker: marker });
    }
    if (err.message === "Thiếu email hoặc password_enc.") {
      return res.status(400).json({ error: err.message, _marker: marker });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "Check thất bại.",
      _marker: marker,
      _stack: err.stack,
    });
  }
};

const runCheckWithCookies = async (_req, res) => {
  return res.status(400).json({
    error:
      "Endpoint check-with-cookies không còn hỗ trợ. Dùng POST /accounts/:id/check.",
  });
};

module.exports = {
  runCheckForAccountId,
  runCheck,
  runCheckWithCookies,
};
