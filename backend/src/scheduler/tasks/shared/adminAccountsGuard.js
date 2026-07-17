/**
 * Guard chung cho các cron Renew Adobe: chỉ chạy khi `accounts_admin` có dữ liệu.
 * Rỗng → cron skip ngay (tránh đụng dữ liệu khi shop chưa add admin nào).
 */

const { db } = require("@/db");
const logger = require("@/utils/logger");
const {
  TABLE: ACCOUNTS_ADMIN_TABLE,
  COLS: ACCOUNTS_ADMIN_COLS,
} = require("@/domains/renew-adobe/controller/accountTable");

/**
 * @returns {Promise<boolean>} true khi tồn tại ≥ 1 row trong `accounts_admin`.
 */
async function hasAdminAccounts() {
  try {
    const row = await db(ACCOUNTS_ADMIN_TABLE)
      .count({ c: ACCOUNTS_ADMIN_COLS.ID })
      .first();
    return Number(row?.c || 0) > 0;
  } catch (err) {
    logger.error("[adminAccountsGuard] count accounts_admin thất bại", {
      error: err?.message,
      stack: err?.stack,
    });
    return false;
  }
}

/**
 * Tiện ích: gọi trong từng cron task để skip với log thống nhất.
 * Trả về `true` nếu được phép chạy tiếp, `false` nếu nên return sớm.
 */
async function ensureAdminAccountsExist({ taskName, trigger = "cron" } = {}) {
  const ok = await hasAdminAccounts();
  if (!ok) {
    logger.info(
      "[CRON] Bỏ qua %s — bảng accounts_admin trống (chưa có tài khoản admin Adobe).",
      taskName,
      { trigger, pid: process.pid }
    );
  }
  return ok;
}

module.exports = {
  hasAdminAccounts,
  ensureAdminAccountsExist,
};
