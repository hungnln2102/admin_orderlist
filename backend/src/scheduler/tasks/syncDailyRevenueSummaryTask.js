/**
 * Cron / manual: đồng bộ daily_revenue_summary từ mốc thuế đến hôm nay (UPSERT).
 * Đơn mới hoặc chỉnh sửa đơn — query đọc lại order_list nên mỗi lần chạy đều tính đủ.
 */
const logger = require("../../utils/logger");
const {
  runDailyRevenueSummaryBackfill,
  vnTodayYmd,
  TAX_ORDER_LIST_FROM_DEFAULT,
  IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT,
} = require("../../services/dashboard/dailyRevenueSummaryBackfill");

function envTrim(key) {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

function resolveImportSpreadDays() {
  const raw = envTrim("DAILY_REVENUE_SUMMARY_IMPORT_SPREAD_DAYS");
  if (!raw) return IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : IMPORT_SPREAD_FALLBACK_DAYS_DEFAULT;
}

async function syncDailyRevenueSummaryTask(trigger = "cron") {
  /** Chỉ tắt lịch tự động; gọi tay (CLI / API / scheduler once) vẫn chạy. */
  if (
    trigger === "cron" &&
    process.env.ENABLE_DAILY_REVENUE_SUMMARY_CRON === "false"
  ) {
    logger.info("[daily-revenue-summary] Bỏ qua cron (ENABLE_DAILY_REVENUE_SUMMARY_CRON=false)");
    return;
  }

  const fromEnv = envTrim("DAILY_REVENUE_SUMMARY_FROM");
  /** Luôn tính lại toàn bộ khoảng [from … hôm nay] để đơn mới/sửa phản ánh đúng. */
  const from = fromEnv || TAX_ORDER_LIST_FROM_DEFAULT;
  const to = vnTodayYmd();
  const taxFromRaw = envTrim("DAILY_REVENUE_SUMMARY_TAX_FROM");
  const taxFrom = taxFromRaw || TAX_ORDER_LIST_FROM_DEFAULT;
  const importSpreadDays = resolveImportSpreadDays();

  logger.info("[daily-revenue-summary] Bắt đầu đồng bộ", {
    trigger,
    from,
    to,
    taxFrom,
    importSpreadDays,
  });

  await runDailyRevenueSummaryBackfill({
    from,
    to,
    taxFrom,
    importSpreadDays,
    closeKnex: false,
  });

  logger.info("[daily-revenue-summary] Hoàn thành", { trigger, from, to });
}

module.exports = {
  syncDailyRevenueSummaryTask,
};
