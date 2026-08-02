const logger = require("@/utils/logger");
// Removed direct telegram require

const { todayYMDInVietnam } = require("@/utils/normalizers");
const { computeOrderCurrentPrice } = require("../../../webhook/sepay/renewal");
const { fetchVariantDisplayNames } = require("@/scheduler/variantDisplayNames");
const { ORDER_PREFIXES } = require("@/utils/orderHelpers");
const { buildRenewalQuery, normalizeNotifyRow } = require("@/scheduler/tasks/shared");
const { resolveRenewalNotifyPrice } = require("@/scheduler/tasks/shared/resolveRenewalNotifyPrice");
const {
  claimDailyNotificationRun,
  releaseDailyNotificationRun,
  claimOrderOnceNotification,
} = require("@/scheduler/tasks/shared/dailyNotificationGuard");

const ADVISORY_LOCK_KEY_1 = 90101;
const ADVISORY_LOCK_KEY_2 = 4;

async function acquireAdvisoryLock(client) {
  const lockResult = await client.query(
    "SELECT pg_try_advisory_lock($1, $2) AS locked",
    [ADVISORY_LOCK_KEY_1, ADVISORY_LOCK_KEY_2]
  );
  return lockResult.rows?.[0]?.locked === true;
}

async function releaseAdvisoryLock(client, hasLock) {
  if (!hasLock) return;
  await client
    .query("SELECT pg_advisory_unlock($1, $2)", [
      ADVISORY_LOCK_KEY_1,
      ADVISORY_LOCK_KEY_2,
    ])
    .catch((unlockErr) =>
      logger.warn("[CRON] Không thể unlock advisory lock notifyFourDays", {
        error: unlockErr.message,
        pid: process.pid,
      })
    );
}

async function checkDailyNotificationGuard(client, dateYmd, trigger) {
  const isManual = trigger === "manual";
  const dailyGuard = await claimDailyNotificationRun(client, {
    notificationCode: "notify-four-days",
    dateYmd,
    trigger,
  });
  if (!isManual && !dailyGuard.claimed) {
    return { shouldRun: false, key: dailyGuard.key };
  }
  return {
    shouldRun: true,
    key: isManual && !dailyGuard.claimed ? null : dailyGuard.key,
  };
}

async function getRenewalNotificationCandidates(client, sqlDate) {
  const result = await client.query(buildRenewalQuery(sqlDate, 4));

  const giftPrefix = String(ORDER_PREFIXES.gift || "MAVT")
    .trim()
    .toUpperCase();
  const notifyRows = result.rows.filter((row) => {
    const code = String(row.id_order || row.idOrder || "")
      .trim()
      .toUpperCase();
    return !(giftPrefix && code.startsWith(giftPrefix));
  });
  const skippedGiftCount = result.rows.length - notifyRows.length;

  logger.info(
    `Tìm thấy ${result.rowCount} đơn cần gia hạn (còn 4 ngày), gửi ${notifyRows.length} đơn`,
    { skippedGiftCount, giftPrefix }
  );

  if (notifyRows.length === 0) return [];

  const today = todayYMDInVietnam();
  const variantIds = notifyRows.map((r) => r.id_product).filter((id) => id != null);
  const nameMap = await fetchVariantDisplayNames(client, variantIds);

  const seenOrderKeys = new Set();
  const uniqueRows = [];
  for (const row of notifyRows) {
    const raw = String(row.id_order || row.idOrder || "").trim();
    const k = raw ? raw.toUpperCase() : "";
    if (seenOrderKeys.has(k)) continue;
    seenOrderKeys.add(k);
    uniqueRows.push(row);
  }

  const candidates = [];
  for (const row of uniqueRows) {
    const computed = await computeOrderCurrentPrice(client, row);
    const notifyPrice = await resolveRenewalNotifyPrice(client, row, computed);
    candidates.push(
      normalizeNotifyRow(row, today, nameMap, {
        ...computed,
        price: notifyPrice,
      })
    );
  }

  return candidates;
}

async function dispatchNotificationEvents(client, candidates, dateYmd, trigger) {
  const isManual = trigger === "manual";
  const pending = [];
  for (const o of candidates) {
    const code = String(o.id_order || o.idOrder || "").trim();
    if (!code || isManual) {
      pending.push({ order: o, perOrderKey: null });
      continue;
    }
    const { claimed, key: perOrderKey } = await claimOrderOnceNotification(client, {
      kind: "4d",
      dateYmd,
      orderCode: code,
      trigger,
    });
    if (claimed) {
      pending.push({ order: o, perOrderKey });
    } else {
      logger.warn(
        "[CRON] Bỏ qua thông báo 4 ngày cho mã đơn (đã gửi hoặc process khác đã giữ chốt)",
        { orderCode: code, dateYmd, perOrderKey, trigger }
      );
    }
  }

  if (pending.length > 0) {
    try {
      const { eventBus, EVENTS } = require("@/events");
      eventBus.emit(EVENTS.DAILY_FOUR_DAYS_DUE, pending.map((p) => p.order));
    } catch (sendErr) {
      for (const p of pending) {
        if (p.perOrderKey) {
          await releaseDailyNotificationRun(client, p.perOrderKey);
        }
      }
      throw sendErr;
    }
  } else {
    logger.info(
      "[CRON] Không còn đơn 4 ngày nào sau chốt từng mã (có thể trùng process)"
    );
  }
}

function createNotifyFourDaysTask(pool, getSqlCurrentDate) {
  return async function notifyFourDaysRemainingTask(trigger = "cron") {
    const sqlDate = getSqlCurrentDate();
    const dateYmd = todayYMDInVietnam();
    logger.info(
      `[CRON] Bắt đầu thông báo các đơn cần gia hạn (còn 4 ngày)`,
      {
        trigger,
        pid: process.pid,
        date: process.env.MOCK_DATE || "CURRENT_DATE",
        dateYmd,
      }
    );

    if (process.env.MOCK_DATE) {
      logger.warn(`[TEST MODE] Đang sử dụng ngày giả định: ${process.env.MOCK_DATE}`);
    }

    const client = await pool.connect();
    let hasLock = false;
    let dailyGuardKey = null;
    try {
      hasLock = await acquireAdvisoryLock(client);
      if (!hasLock) {
        logger.warn(
          "[CRON] notifyFourDays task đang chạy ở process khác — bỏ qua lần gọi trùng",
          { trigger, pid: process.pid }
        );
        return;
      }

      const guard = await checkDailyNotificationGuard(client, dateYmd, trigger);
      dailyGuardKey = guard.key;
      if (!guard.shouldRun) {
        logger.warn(
          "[CRON] notifyFourDays đã gửi trong ngày — bỏ qua lần gọi trùng",
          { trigger, pid: process.pid, dateYmd, dailyGuardKey }
        );
        return;
      }

      const candidates = await getRenewalNotificationCandidates(client, sqlDate);
      if (candidates.length === 0) {
        logger.info(
          "[CRON] Không có đơn nào cần gia hạn để gửi thông báo (còn 4 ngày, bỏ qua MAVT hoặc sau lọc trùng)"
        );
      } else {
        await dispatchNotificationEvents(client, candidates, dateYmd, trigger);
      }
    } catch (err) {
      logger.error("[CRON] Lỗi khi thông báo đơn cần gia hạn (còn 4 ngày)", {
        error: err.message,
        stack: err.stack,
      });
      await releaseDailyNotificationRun(client, dailyGuardKey);
      throw err;
    } finally {
      await releaseAdvisoryLock(client, hasLock);
      client.release();
    }
  };
}

module.exports = { createNotifyFourDaysTask };
