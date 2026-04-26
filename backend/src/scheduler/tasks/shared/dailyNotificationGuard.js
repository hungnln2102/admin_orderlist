const crypto = require("crypto");
const logger = require("../../../utils/logger");

const SITE_SETTINGS_TABLE = "admin.site_settings";
/** Khóa site_settings.varchar(50) — không vượt quá. */
const MAX_KEY_LEN = 50;

function buildDailyNotificationKey(notificationCode, dateYmd) {
  return `scheduler:${notificationCode}:${dateYmd}`;
}

/**
 * Khóa idempotent theo từng mã đơn / ngày (vd 4d/0d) — chặn gửi trùng dù 2 process hoặc 2 bộ .env
 * cùng ghi vào cùng một PostgreSQL.
 * @param {string} kind - tiền tố ngắn, vd "4d" (đến hạn 4 ngày) hoặc "0d" (hết hạn 0 ngày)
 * @param {string} dateYmd - YYYY-MM-DD
 * @param {string} orderCode - mã id_order
 */
function buildPerOrderNotificationKey(kind, dateYmd, orderCode) {
  const d = String(dateYmd).replace(/-/g, "");
  const code = String(orderCode || "").trim();
  if (!d || !code) return null;
  let head = `${kind}:${d}:`;
  if (head.length + code.length <= MAX_KEY_LEN) {
    return head + code;
  }
  const h = crypto.createHash("sha256").update(code).digest("hex").slice(0, 16);
  return `${head}${h}`.slice(0, MAX_KEY_LEN);
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

/**
 * Một mã đơn chỉ được gửi tối đa 1 lần / loại / ngày (INSERT duy nhất theo key).
 * @returns {{ key: string|null, claimed: boolean }}
 */
async function claimOrderOnceNotification(
  client,
  { kind, dateYmd, orderCode, trigger, source = "telegram" }
) {
  const key = buildPerOrderNotificationKey(kind, dateYmd, orderCode);
  if (!key) {
    return { key: null, claimed: false };
  }
  const payload = JSON.stringify({
    kind,
    dateYmd,
    orderCode: String(orderCode || "").trim(),
    trigger,
    source,
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

module.exports = {
  buildDailyNotificationKey,
  buildPerOrderNotificationKey,
  claimDailyNotificationRun,
  releaseDailyNotificationRun,
  claimOrderOnceNotification,
};
