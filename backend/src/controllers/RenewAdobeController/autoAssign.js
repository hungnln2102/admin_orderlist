const { db } = require("../../db");
const logger = require("../../utils/logger");
const adobeRenewV2 = require("../../services/adobe-renew-v2");
const { TABLE, COLS, MAX_USERS_PER_ACCOUNT } = require("./accountTable");
const {
  buildAvailableAccounts,
  assignUserToAvailableAccount,
  fixUsersOneRoundTightest,
} = require("./assignmentService");
const {
  TBL_ORDER,
  ORD_COLS,
  ALLOWED_ORDER_STATUSES,
  getRenewAdobeVariantIds,
} = require("./orderAccess");
const {
  purgeAndDeleteNoLicenseAdobeAdminAccount,
} = require("../../services/renewAdobePurgeNoLicenseAccount");

const MAX_CHECK_ALL_CONCURRENT = 3;

function logAutoAssign(onProgress, data) {
  if (onProgress) {
    onProgress(data);
  }
  logger.info("[renew-adobe] autoAssign: %s", JSON.stringify(data));
}

async function autoAssignUsers({ onProgress = null } = {}) {
  const variantIds = await getRenewAdobeVariantIds();
  let activeOrders = [];

  if (variantIds.length > 0) {
    activeOrders = await db(TBL_ORDER)
      .select(
        `${TBL_ORDER}.${ORD_COLS.INFORMATION_ORDER} as email`,
        `${TBL_ORDER}.${ORD_COLS.STATUS} as status`,
        `${TBL_ORDER}.${ORD_COLS.EXPIRY_DATE} as expiry_date`
      )
      .whereIn(ORD_COLS.ID_PRODUCT, variantIds)
      .whereIn(ORD_COLS.STATUS, ALLOWED_ORDER_STATUSES)
      .whereNotNull(ORD_COLS.INFORMATION_ORDER);
  }

  const now = new Date();
  const activeEmails = new Set();
  for (const order of activeOrders) {
    if (order.expiry_date && new Date(order.expiry_date) < now) {
      continue;
    }
    const email = (order.email || "").trim().toLowerCase();
    if (email) {
      activeEmails.add(email);
    }
  }

  logAutoAssign(onProgress, { step: "active_orders", count: activeEmails.size });

  const accounts = await db(TABLE)
    .select(
      COLS.ID,
      COLS.EMAIL,
      COLS.PASSWORD_ENC,
      COLS.ORG_NAME,
      COLS.LICENSE_STATUS,
      COLS.USER_COUNT,
      COLS.USERS_SNAPSHOT,
      COLS.ALERT_CONFIG,
      COLS.MAIL_BACKUP_ID
    )
    .where(COLS.IS_ACTIVE, true)
    .orderBy(COLS.ID, "asc");

  const existingEmails = new Set();
  for (const account of accounts) {
    try {
      const snapshot = JSON.parse(account[COLS.USERS_SNAPSHOT] || "[]");
      for (const user of snapshot) {
        if (user.email) {
          existingEmails.add(user.email.toLowerCase().trim());
        }
      }
    } catch (parseErr) {
      logger.warn("[AutoAssign] Parse users_snapshot thất bại", { accountId: account[COLS.ID], error: parseErr.message });
    }
  }

  const emailsToAdd = [...activeEmails].filter((email) => !existingEmails.has(email));
  logAutoAssign(onProgress, { step: "emails_to_add", count: emailsToAdd.length });

  if (emailsToAdd.length === 0) {
    return { assigned: 0, skipped: 0, errors: [] };
  }

  const available = buildAvailableAccounts(accounts);
  logAutoAssign(onProgress, {
    step: "available_accounts",
    count: available.length,
    slots: available.map((account) => ({
      id: account[COLS.ID],
      slots: MAX_USERS_PER_ACCOUNT - account.currentCount,
    })),
  });

  if (available.length === 0) {
    logAutoAssign(onProgress, {
      step: "no_slots",
      message: "Không có tài khoản nào còn slot",
    });
    return { assigned: 0, skipped: emailsToAdd.length, errors: [] };
  }

  let remaining = [...emailsToAdd];
  const distribution = [];

  for (const account of available) {
    if (remaining.length === 0) {
      break;
    }

    const slotsLeft = MAX_USERS_PER_ACCOUNT - account.currentCount;
    const take = Math.min(slotsLeft, remaining.length);
    const chunk = remaining.splice(0, take);
    if (chunk.length > 0) {
      distribution.push({ account, emails: chunk });
    }
  }

  let totalAssigned = 0;
  const errors = [];

  for (const { account, emails } of distribution) {
    const accountId = account[COLS.ID];
    const accountEmail = account[COLS.EMAIL];
    const accountPassword = account[COLS.PASSWORD_ENC] || "";

    logAutoAssign(onProgress, {
      step: "adding",
      accountId,
      accountEmail,
      userCount: emails.length,
    });

    try {
      const mailBackupId =
        account[COLS.MAIL_BACKUP_ID] != null
          ? Number(account[COLS.MAIL_BACKUP_ID])
          : null;
      const savedCookies = account[COLS.ALERT_CONFIG]?.cookies || [];
      const v2 = await adobeRenewV2.addUsersWithProductV2(
        accountEmail,
        accountPassword,
        emails,
        {
          savedCookies,
          mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
          orgId: account[COLS.ORG_ID] || null,
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

      const addedCount = v2.addResult?.added?.length ?? emails.length;
      totalAssigned += addedCount;

      logAutoAssign(onProgress, {
        step: "done",
        accountId,
        added: addedCount,
        assignProduct: v2.assignResult?.success ?? false,
      });
    } catch (err) {
      logger.error(
        "[renew-adobe] autoAssign add failed: account=%s, error=%s",
        accountId,
        err.message
      );
      errors.push(`Account ${accountId}: ${err.message}`);
    }
  }

  const skipped = remaining.length;
  logAutoAssign(onProgress, {
    step: "complete",
    assigned: totalAssigned,
    skipped,
    errors: errors.length,
  });

  return { assigned: totalAssigned, skipped, errors };
}

const runAutoAssign = async (_req, res) => {
  try {
    const result = await autoAssignUsers();
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error("[renew-adobe] runAutoAssign failed", { error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
};

const fixSingleUser = async (req, res) => {
  const userEmail = (req.body?.email || "").toString().trim().toLowerCase();
  if (!userEmail) {
    return res.status(400).json({ error: "Thiếu email." });
  }

  try {
    const assigned = await assignUserToAvailableAccount(userEmail);

    return res.json({
      success: true,
      message: `Đã gán ${userEmail} vào ${assigned.accountEmail}.`,
      accountId: assigned.accountId,
      accountEmail: assigned.accountEmail,
      profile: assigned.profileName ?? "—",
    });
  } catch (err) {
    logger.error("[renew-adobe] fixSingleUser failed", {
      email: userEmail,
      error: err.message,
    });
    return res.status(500).json({ success: false, error: err.message });
  }
};

/** Một vòng Fix All: batch user theo slot tài khoản gần đầy nhất (gọi lặp từ frontend cho tới hết danh sách). */
const fixUsersRound = async (req, res) => {
  const emailsRaw = req.body?.emails;
  if (!Array.isArray(emailsRaw)) {
    return res.status(400).json({
      success: false,
      error: "Thiếu emails (mảng).",
      remaining_emails: [],
    });
  }

  try {
    const result = await fixUsersOneRoundTightest(emailsRaw);
    return res.json(result);
  } catch (err) {
    logger.error("[renew-adobe] fixUsersRound failed", { error: err.message });
    return res.status(500).json({
      success: false,
      error: err.message,
      added_count: 0,
      remaining_emails: emailsRaw,
      round: null,
    });
  }
};

const adobeQueueStatus = (_req, res) => {
  return res.json({
    running: 0,
    queued: 0,
    maxConcurrent: 10,
    maxQueueSize: 100,
  });
};

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
    const rows = await db(TABLE)
      .select(COLS.ID, COLS.EMAIL)
      .where(COLS.IS_ACTIVE, true)
      .orderBy(COLS.ID, "asc");

    const total = rows.length;
    if (total === 0) {
      sendEvent({ type: "complete", total: 0, completed: 0, failed: 0 });
      return res.end();
    }

    sendEvent({ type: "start", total });

    let completed = 0;
    let failed = 0;
    let index = 0;
    const queue = [...rows];

    await new Promise((resolve) => {
      const running = new Set();

      function next() {
        if (aborted) {
          resolve();
          return;
        }

        while (running.size < MAX_CHECK_ALL_CONCURRENT && index < queue.length) {
          const account = queue[index++];
          const id = account[COLS.ID];
          const email = account[COLS.EMAIL];

          sendEvent({ type: "checking", id, email, completed, failed, total });

          const task = (async () => {
            try {
              await runCheckForAccountId(id);
              completed++;
              let updated = await db(TABLE).where(COLS.ID, id).first();
              let removedFromDb = false;
              if (updated && updated[COLS.LICENSE_STATUS] !== "Paid") {
                const { deletedFromDb } =
                  await purgeAndDeleteNoLicenseAdobeAdminAccount(updated, {
                    logPrefix: "[renew-adobe][check-all]",
                  });
                if (deletedFromDb) {
                  removedFromDb = true;
                  updated = null;
                }
              }
              sendEvent({
                type: "done",
                id,
                email,
                completed,
                failed,
                total,
                removed_from_db: removedFromDb,
                org_name: updated?.[COLS.ORG_NAME] ?? null,
                user_count: updated?.[COLS.USER_COUNT] ?? 0,
                license_status: updated?.[COLS.LICENSE_STATUS] ?? "unknown",
              });
            } catch (err) {
              completed++;
              failed++;
              sendEvent({
                type: "error",
                id,
                email,
                error: err.message,
                completed,
                failed,
                total,
              });
            }
          })().then(() => {
            running.delete(task);
            if (running.size === 0 && index >= queue.length) {
              resolve();
            } else {
              next();
            }
          });

          running.add(task);
        }

        if (running.size === 0 && index >= queue.length) {
          resolve();
        }
      }

      next();
    });

    sendEvent({ type: "complete", total, completed, failed });

    if (!aborted) {
      sendEvent({ type: "auto_assign_start" });
      try {
        const assignResult = await autoAssignUsers({
          onProgress: (message) => {
            sendEvent({ type: "auto_assign_progress", ...message });
          },
        });
        sendEvent({ type: "auto_assign_done", ...assignResult });
      } catch (assignError) {
        sendEvent({ type: "auto_assign_error", error: assignError.message });
      }
    }
  } catch (err) {
    logger.error("[renew-adobe] Check all failed", { error: err.message });
    sendEvent({ type: "fatal", error: err.message });
  }

  return res.end();
};

module.exports = {
  adobeQueueStatus,
  checkAllAccounts,
  autoAssignUsers,
  runAutoAssign,
  fixSingleUser,
  fixUsersRound,
};
