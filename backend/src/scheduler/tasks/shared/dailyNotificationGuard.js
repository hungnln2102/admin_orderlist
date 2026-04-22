const logger = require("../../../utils/logger");

const SITE_SETTINGS_TABLE = "admin.site_settings";

function buildDailyNotificationKey(notificationCode, dateYmd) {
  return `scheduler:${notificationCode}:${dateYmd}`;
}

async function claimDailyNotificationRun(client, { notificationCode, dateYmd, trigger }) {
  const key = buildDailyNotificationKey(notificationCode, dateYmd);
  const payload = JSON.stringify({
    notificationCode,
    dateYmd,
    trigger,
    pid: process.pid,
    claimedAt: new Date().toISOString(),
  });

  const result = await client.query(
    `
      INSERT INTO ${SITE_SETTINGS_TABLE} (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO NOTHING
      RETURNING key
    `,
    [key, payload]
  );

  return {
    key,
    claimed: result.rowCount > 0,
  };
}

async function releaseDailyNotificationRun(client, key) {
  if (!key) return;

  try {
    await client.query(
      `DELETE FROM ${SITE_SETTINGS_TABLE} WHERE key = $1`,
      [key]
    );
  } catch (err) {
    logger.warn("[CRON] Không thể rollback daily notification guard key", {
      key,
      error: err.message,
      pid: process.pid,
    });
  }
}

module.exports = {
  buildDailyNotificationKey,
  claimDailyNotificationRun,
  releaseDailyNotificationRun,
};
