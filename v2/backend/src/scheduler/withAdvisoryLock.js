const { db } = require("@/db");

const withAdvisoryLock = async (lockName, handler) => db.transaction(async (trx) => {
  const result = await trx.raw(
    "SELECT pg_try_advisory_xact_lock(hashtext(?)) AS acquired",
    [lockName]
  );
  const acquired = result.rows?.[0]?.acquired === true;

  if (!acquired) {
    console.warn(`[Scheduler] Bỏ qua ${lockName}: một tiến trình khác đang chạy.`);
    return { skipped: true };
  }

  return handler();
});

module.exports = { withAdvisoryLock };
