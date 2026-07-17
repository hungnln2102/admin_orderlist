const { db } = require("@/db");

const {
  defaultFrom22nd,
  vnTodayYmd,
  TAX_ORDER_LIST_FROM_DEFAULT,
  IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT,
} = require("@/services/dashboard/dailyRevenueSummaryBackfill/shared");
const { executeDailyRevenueSummaryBackfill } = require("@/services/dashboard/dailyRevenueSummaryBackfill/queryRepository");

/**
 * @param {object} [options]
 * @param {string} [options.from] yyyy-mm-dd (mặc định: mốc ngày 22 rolling — giống CLI không truyền --from)
 * @param {string} [options.to] yyyy-mm-dd (mặc định: hôm nay VN)
 * @param {string} [options.taxFrom] yyyy-mm-dd (mặc định: TAX_ORDER_LIST_FROM_DEFAULT)
 * @param {number} [options.importSpreadDays]
 * @param {boolean} [options.closeKnex] đóng pool Knex sau khi chạy (CLI); scheduler không bật
 */
async function runDailyRevenueSummaryBackfill(options = {}) {
  const from = options.from ?? defaultFrom22nd();
  const to = options.to ?? vnTodayYmd();
  const taxFrom = options.taxFrom ?? TAX_ORDER_LIST_FROM_DEFAULT;
  let importSpreadDays = IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT;
  if (
    options.importSpreadDays != null &&
    Number.isFinite(options.importSpreadDays) &&
    options.importSpreadDays >= 1
  ) {
    importSpreadDays = Math.floor(options.importSpreadDays);
  }

  if (from > to) {
    throw new Error(`daily_revenue_summary: from phải <= to (${from} .. ${to})`);
  }

  await executeDailyRevenueSummaryBackfill(db, {
    from,
    to,
    taxFrom,
    importSpreadDays,
  });

  if (options.closeKnex) {
    await db.destroy().catch(() => { });
  }
}

module.exports = {
  runDailyRevenueSummaryBackfill,
};
