const { db } = require("../../../db");
const logger = require("../../../utils/logger");
const {
  getAssignedAdobeAccountIdForUserEmail,
  getEmailSetAlreadyAssignedToAdobe,
} = require("../../../services/userAccountMappingService");
const {
  upsertRenewAdobeOrderUserTrackingForAccount,
} = require("../../../services/renew-adobe/orderUserTrackingService");
const {
  TABLE,
  COLS,
  buildAvailableAccounts,
  getAccountsBaseSelectCols,
} = require("./availableAccounts");
const {
  isAdobeSlotFullAddError,
  normalizeDistinctEmails,
  addUsersToAdobe,
  persistAfterAddSuccess,
} = require("./helpers");

async function fixUsersOneRoundTightest(userEmailsRaw) {
  const remainingDistinct = normalizeDistinctEmails(userEmailsRaw);
  if (remainingDistinct.length === 0) {
    return {
      success: true,
      added_count: 0,
      remaining_emails: [],
      round: null,
    };
  }

  const alreadyAssignedEmails = await getEmailSetAlreadyAssignedToAdobe(
    remainingDistinct
  );
  const refreshAccountIds = new Set();
  for (const em of remainingDistinct) {
    if (alreadyAssignedEmails.has(em)) {
      const aid = await getAssignedAdobeAccountIdForUserEmail(em);
      if (aid) refreshAccountIds.add(aid);
    }
  }
  for (const aid of refreshAccountIds) {
    await upsertRenewAdobeOrderUserTrackingForAccount(aid).catch((error) => {
      logger.warn("[renew-adobe] fixUsersOneRoundTightest tracking refresh failed", {
        accountId: aid,
        error: error.message,
      });
    });
  }

  const needAdd = remainingDistinct.filter((e) => !alreadyAssignedEmails.has(e));
  if (needAdd.length === 0) {
    return {
      success: true,
      added_count: 0,
      remaining_emails: [],
      skipped_already_assigned: remainingDistinct.length,
      round: null,
    };
  }

  const accounts = await db(TABLE)
    .select(...getAccountsBaseSelectCols())
    .orderBy(COLS.ID, "asc");
  const available = await buildAvailableAccounts(accounts);
  if (available.length === 0) {
    return {
      success: false,
      error: "Không có tài khoản nào còn gói và còn slot.",
      added_count: 0,
      remaining_emails: needAdd,
      round: null,
    };
  }

  let lastAddErr = null;
  for (let ai = 0; ai < available.length; ai += 1) {
    const target = available[ai];
    const accountId = target[COLS.ID];
    const accountEmail = target[COLS.EMAIL];
    const slotsLeft = Math.max(0, target.userLimit - target.currentCount);
    const take = Math.min(slotsLeft, needAdd.length);
    if (take === 0) continue;

    const chunk = needAdd.slice(0, take);
    const stillRemaining = needAdd.slice(take);

    logger.info(
      "[renew-adobe] fixUsersOneRoundTightest: account=%s (thử %d/%d) slotsLeft=%s batchSize=%s still=%s",
      accountId,
      ai + 1,
      available.length,
      slotsLeft,
      chunk.length,
      stillRemaining.length
    );

    let v2;
    try {
      v2 = await addUsersToAdobe({ target, emails: chunk });
    } catch (addErr) {
      lastAddErr = addErr?.message || String(addErr);
      logger.warn(
        "[renew-adobe] fixUsersOneRoundTightest: addUsersWithProductV2 ném lỗi (id=%s), thử tài khoản khác: %s",
        accountId,
        lastAddErr
      );
      continue;
    }

    if (!v2.success) {
      lastAddErr = v2.error || "addUsersWithProductV2 thất bại";
      if (isAdobeSlotFullAddError(lastAddErr)) {
        logger.warn(
          "[renew-adobe] fixUsersOneRoundTightest: Adobe đầy slot (id=%s), thử tài khoản khác",
          accountId
        );
        continue;
      }
      return {
        success: false,
        error: lastAddErr,
        added_count: 0,
        remaining_emails: needAdd,
        round: null,
      };
    }

    try {
      await persistAfterAddSuccess({
        context: "fixUsersOneRoundTightest",
        target,
        accountId,
        fallbackAddedEmails: chunk,
        v2,
      });
    } catch (postErr) {
      logger.error("[renew-adobe] fixUsersOneRoundTightest: đã add trên Adobe nhưng cập nhật DB thất bại", {
        accountId,
        error: postErr?.message || String(postErr),
      });
      return {
        success: false,
        error:
          (postErr?.message || "Lỗi sau khi thêm user (cần đối chiếu Adobe vs DB).") +
          " — không thử tài khoản khác để tránh gán trùng user.",
        added_count: 0,
        remaining_emails: needAdd,
        round: null,
      };
    }

    return {
      success: true,
      added_count: (v2.addResult?.added?.length > 0 ? v2.addResult.added : chunk).length,
      remaining_emails: stillRemaining,
      round: {
        accountId,
        accountEmail,
        emails: chunk,
        slotsLeft,
        batchSize: chunk.length,
      },
    };
  }

  return {
    success: false,
    error:
      lastAddErr ||
      "Không còn tài khoản thử thêm: hết slot theo DB hoặc mọi tài khoản đều đầy trên Adobe.",
    added_count: 0,
    remaining_emails: needAdd,
    round: null,
  };
}

const FIX_ALL_MAX_ROUNDS = 500;

async function fixUsersAllRoundsTightest(userEmailsRaw) {
  const initialDistinct = normalizeDistinctEmails(userEmailsRaw);
  if (initialDistinct.length === 0) {
    return {
      success: true,
      total_added: 0,
      added_count: 0,
      rounds: [],
      remaining_emails: [],
    };
  }

  let pending = initialDistinct;
  let totalAdded = 0;
  const rounds = [];
  let lastSkipped = 0;

  for (let i = 0; i < FIX_ALL_MAX_ROUNDS; i += 1) {
    if (pending.length === 0) break;
    const r = await fixUsersOneRoundTightest(pending);

    if (r.skipped_already_assigned != null && r.round == null) {
      lastSkipped = Number(r.skipped_already_assigned) || 0;
      return {
        success: true,
        total_added: 0,
        added_count: 0,
        rounds: [],
        remaining_emails: [],
        skipped_already_assigned: lastSkipped,
      };
    }

    if (!r.success) {
      return {
        success: false,
        error: r.error,
        total_added: totalAdded,
        added_count: totalAdded,
        rounds,
        remaining_emails: r.remaining_emails || pending,
      };
    }

    const added = Number(r.added_count) || 0;
    const next = Array.isArray(r.remaining_emails) ? r.remaining_emails : [];
    totalAdded += added;

    if (r.round) {
      const rr = r.round;
      rounds.push({
        accountId: rr.accountId,
        accountEmail: rr.accountEmail,
        slotsLeft: rr.slotsLeft,
        batchSize: rr.batchSize ?? (Array.isArray(rr.emails) ? rr.emails.length : 0),
        emails: rr.emails || [],
        added_in_round: added,
      });
    }

    if (added === 0) {
      if (next.length > 0) {
        return {
          success: false,
          error: r.error || "Không thêm được user trong vòng này.",
          total_added: totalAdded,
          added_count: totalAdded,
          rounds,
          remaining_emails: next,
        };
      }
      break;
    }

    pending = next;
    if (pending.length === 0) break;
  }

  if (pending.length > 0) {
    return {
      success: false,
      error: "Fix All vượt số vòng tối đa — tăng hạn mức hoặc giảm danh sách.",
      total_added: totalAdded,
      added_count: totalAdded,
      rounds,
      remaining_emails: pending,
    };
  }

  return {
    success: true,
    total_added: totalAdded,
    added_count: totalAdded,
    rounds,
    remaining_emails: [],
  };
}

module.exports = {
  FIX_ALL_MAX_ROUNDS,
  fixUsersOneRoundTightest,
  fixUsersAllRoundsTightest,
};
