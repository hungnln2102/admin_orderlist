const { notifyWarn } = require("../../../../domains/notifications/telegram").systemNotifier;
const {
  purgeAndDeleteNoLicenseAdobeAdminAccount,
} = require("../../../../services/renew-adobe/renewAdobePurgeNoLicenseAccount");
const { shouldPurgeAdobeAccountByLicenseStatus } = require("../statusUtils");
const {
  getProfileUsageSnapshot,
} = require("../../../../services/renew-adobe/adobe-renew-v2/shared/profileUsageMetrics");
const { autoAssignUsers } = require("./autoAssignUsers");
const { db, logger, TABLE, COLS, MAP_TABLE, MAP_COLS, getOrderUserTrackingCountByOrgName } = require("./shared");

async function runCheckAllAccountsFlow({
  runCheckForAccountId,
  onEvent = null,
  shouldAbort = () => false,
  includeAutoAssign = true,
  logPrefix = "[renew-adobe][check-all]",
}) {
  const emit = (data) => {
    if (typeof onEvent === "function") {
      onEvent(data);
    }
  };

  const rows = await db(TABLE)
    .select(COLS.ID, COLS.EMAIL)
    .where(COLS.IS_ACTIVE, true)
    .orderBy(COLS.ID, "asc");

  const total = rows.length;
  if (total === 0) {
    emit({ type: "complete", total: 0, completed: 0, failed: 0 });
    return {
      total: 0,
      completed: 0,
      failed: 0,
      autoAssign: null,
    };
  }

  emit({ type: "start", total });

  let completed = 0;
  let failed = 0;
  const queue = [...rows];
  const nonPaidForTelegram = [];

  for (const account of queue) {
    if (shouldAbort()) {
      break;
    }
    const id = account[COLS.ID];
    const email = account[COLS.EMAIL];

    emit({ type: "checking", id, email, completed, failed, total });

    try {
      await runCheckForAccountId(id);
      completed++;
      let updated = await db(TABLE).where(COLS.ID, id).first();
      let removedFromDb = false;
      const statusAfterCheck = updated?.[COLS.LICENSE_STATUS] ?? null;
      if (updated && shouldPurgeAdobeAccountByLicenseStatus(statusAfterCheck, updated)) {
        const orgNameForTrack = updated[COLS.ORG_NAME] ?? null;
        const adminNorm = (updated[COLS.EMAIL] || "").toLowerCase().trim();
        const trackingCount = await getOrderUserTrackingCountByOrgName(orgNameForTrack);
        const mappedEmails = await db(MAP_TABLE)
          .where(MAP_COLS.ADOBE_ACCOUNT_ID, id)
          .pluck(MAP_COLS.USER_EMAIL);
        const hasNonAdminUserInMapping = (mappedEmails || []).some((ue) => {
          const l = String(ue || "").toLowerCase().trim();
          return l && l !== adminNorm;
        });
        if (trackingCount === 0 && !hasNonAdminUserInMapping) {
          logger.info(
            "%s Bỏ qua xóa tài khoản admin id=%s (%s): không có order_user_tracking cho org và mapping chỉ admin (hoặc rỗng) — giữ tài khoản admin.",
            logPrefix,
            id,
            email
          );
        } else {
          nonPaidForTelegram.push({
            id,
            email,
            org_name: orgNameForTrack,
            license_status: statusAfterCheck,
            removed_from_db: false,
          });
          const { deletedFromDb } = await purgeAndDeleteNoLicenseAdobeAdminAccount(
            updated,
            { logPrefix }
          );
          if (deletedFromDb) {
            removedFromDb = true;
            updated = null;
            const last = nonPaidForTelegram[nonPaidForTelegram.length - 1];
            if (last && last.id === id) {
              last.removed_from_db = true;
            }
          }
        }
      }
      emit({
        type: "done",
        id,
        email,
        completed,
        failed,
        total,
        removed_from_db: removedFromDb,
        org_name: updated?.[COLS.ORG_NAME] ?? null,
        user_count: updated?.[COLS.USER_COUNT] ?? 0,
        license_status: updated?.[COLS.LICENSE_STATUS] ?? statusAfterCheck ?? "unknown",
      });
    } catch (err) {
      completed++;
      failed++;
      let license_status = "unknown";
      try {
        const row = await db(TABLE).where(COLS.ID, id).first();
        license_status = row?.[COLS.LICENSE_STATUS] ?? "unknown";
      } catch (_) {
        /* ignore */
      }
      emit({
        type: "error",
        id,
        email,
        error: err.message,
        completed,
        failed,
        total,
        license_status,
      });
    }
  }

  if (nonPaidForTelegram.length > 0) {
    const lines = nonPaidForTelegram.map((a) => {
      const org = a.org_name ? ` | ${a.org_name}` : "";
      const rm = a.removed_from_db ? " | đã gỡ khỏi DB" : "";
      return `• ${a.email}${org} → ${a.license_status}${rm}`;
    });
    const header = `${logPrefix} ${nonPaidForTelegram.length} tài khoản admin không còn gói (sau check-all)`;
    notifyWarn({
      message: `${header}\n${lines.join("\n")}`,
      messageMaxLength: 3800,
      source: "backend",
    });
  }

  emit({ type: "complete", total, completed, failed });

  let autoAssign = null;
  if (!shouldAbort() && includeAutoAssign) {
    logger.info(
      "%s Đã check xong toàn bộ %d tài khoản (completed=%d, failed=%d) — bắt đầu auto-assign (sau khi check, không song song với check).",
      logPrefix,
      total,
      completed,
      failed
    );
    emit({ type: "auto_assign_start" });
    try {
      autoAssign = await autoAssignUsers({
        onProgress: (message) => {
          emit({ type: "auto_assign_progress", ...message });
        },
      });
      emit({ type: "auto_assign_done", ...autoAssign });
    } catch (assignError) {
      emit({ type: "auto_assign_error", error: assignError.message });
    }
  }

  const checkProfileUsage = getProfileUsageSnapshot("check");
  if (checkProfileUsage.length > 0) {
    logger.info(
      "%s Profile usage(check): %s",
      logPrefix,
      JSON.stringify(checkProfileUsage)
    );
  }

  return {
    total,
    completed,
    failed,
    autoAssign,
  };
}

const checkAllAccounts = async ({
  req,
  res,
  runCheckForAccountId,
}) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  const sendEvent = (data) => {
    if (aborted) {
      return;
    }
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runCheckAllAccountsFlow({
      runCheckForAccountId,
      onEvent: sendEvent,
      shouldAbort: () => aborted,
      includeAutoAssign: true,
      logPrefix: "[renew-adobe][check-all]",
    });
  } catch (err) {
    logger.error("[renew-adobe] Check all failed", { error: err.message });
    sendEvent({ type: "fatal", error: err.message });
  }

  return res.end();
};

module.exports = {
  runCheckAllAccountsFlow,
  checkAllAccounts,
};
