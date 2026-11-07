/**
 * calculateDailySlotCostTask.js
 * Task scheduler chạy định kỳ (qua 0h mỗi ngày hoặc lúc 23:55) để chốt số liệu
 * chi phí gánh cho các slot trống trong Kho Gói Sản Phẩm.
 */
const { calculateDailySlotCosts } = require("@/domains/warehouse/services/slotCostService");
const { withAdvisoryLock } = require("../withAdvisoryLock");
const { getVietnamDateString } = require("@/utils/time");

async function calculateDailySlotCostTask(triggeredBy = "cron_schedule", customDate = null) {
  return withAdvisoryLock("calculate_daily_slot_costs", async () => {
    const targetDate = customDate || getVietnamDateString();
    console.log(`[Scheduler] 🕒 Bắt đầu tính toán chi phí slot trống cho ngày ${targetDate} (${triggeredBy})...`);
    try {
      const result = await calculateDailySlotCosts(targetDate);
      console.log(
        `✅ [SlotCostScheduler] Đã chốt chi phí slot ngày ${targetDate}: ${result.totalVacantSlots} slot trống, tổng chi phí gánh: ${Number(result.totalVacantCost || 0).toLocaleString()} đ (Delta: ${Number(result.costDelta || 0).toLocaleString()} đ)`
      );
      return result;
    } catch (err) {
      console.error(`❌ [SlotCostScheduler] Lỗi tính chi phí slot ngày ${targetDate}:`, err.message);
      throw err;
    }
  });
}

module.exports = { calculateDailySlotCostTask };

