/**
 * finalizeDailySummaryTask.js
 * Tạo sẵn dòng log/bản ghi mới cho ngày mới vào lúc 23:55 (hoặc đảm bảo có bản ghi cho ngày hiện tại).
 */
const { db, TABLES } = require("@/db");
const { withAdvisoryLock } = require("../withAdvisoryLock");

async function finalizeDailySummaryTask(triggeredBy = "cron_2355") {
  return withAdvisoryLock("finalize_daily_summary", async () => {
  console.log(`[Scheduler] 🕒 Bắt đầu chạy task chuẩn bị dòng thống kê cho ngày mới (${triggeredBy})...`);
  try {
    // Lấy ngày hiện tại theo giờ VN (+7)
    const todayStr = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const existing = await db(TABLES.DAILY_REVENUE_SUMMARY)
      .where("summary_date", todayStr)
      .first();

    if (!existing) {
      await db(TABLES.DAILY_REVENUE_SUMMARY).insert({
        summary_date: todayStr,
        earned_revenue: 0,
        total_shop_cost: 0,
        revenue_reversed: 0,
        dashboard_orders_count: 0,
        dashboard_canceled_count: 0,
      });
      console.log(`✅ [DailySummary] Đã khởi tạo sẵn dòng thống kê sạch cho ngày ${todayStr}`);
    } else {
      console.log(`ℹ️ [DailySummary] Dòng thống kê cho ngày ${todayStr} đã tồn tại`);
    }
  } catch (err) {
    console.error(`❌ [DailySummary] Lỗi khởi tạo dòng ngày mới:`, err.message);
    throw err;
  }
  });
}

module.exports = { finalizeDailySummaryTask };
