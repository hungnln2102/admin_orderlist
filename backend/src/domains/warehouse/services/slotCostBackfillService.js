/**
 * Orchestrates historical daily vacant-slot cost recalculation.
 */
const { db, TABLES } = require("@/db");
const { getVietnamDateString } = require("@/utils/time");
const { calculateDailySlotCosts } = require("./slotCostService");
async function backfillSlotCosts({ fromDate, toDate } = {}) {
  let startStr = fromDate;
  if (!startStr) {
    // Tìm ngày đơn MAVN sớm nhất
    const earliestOrder = await db(TABLES.ORDER_LIST)
      .where("id_order", "ilike", "MAVN%")
      .whereNotNull("order_date")
      .orderBy("order_date", "asc")
      .first();

    startStr = earliestOrder?.order_date
      ? getVietnamDateString(earliestOrder.order_date)
      : getVietnamDateString();
  }

  const endStr = toDate ? getVietnamDateString(toDate) : getVietnamDateString();

  console.log(`[SlotCostService] 🚀 Bắt đầu hồi tố chi phí slot từ ${startStr} đến ${endStr}...`);

  const current = new Date(`${startStr}T00:00:00+07:00`);
  const end = new Date(`${endStr}T00:00:00+07:00`);

  let daysCount = 0;
  let totalCostGenerated = 0;

  while (current <= end) {
    const curDateStr = current.toISOString().slice(0, 10);
    try {
      const res = await calculateDailySlotCosts(curDateStr);
      daysCount++;
      totalCostGenerated += res.totalVacantCost || 0;
    } catch (err) {
      console.error(`[SlotCostService] Lỗi tính ngày ${curDateStr}:`, err.message);
    }
    current.setDate(current.getDate() + 1);
  }

  console.log(
    `✅ [SlotCostService] Hoàn tất hồi tố ${daysCount} ngày. Tổng chi phí slot trống ghi nhận: ${totalCostGenerated.toLocaleString()} đ`
  );

  return {
    success: true,
    fromDate: startStr,
    toDate: endStr,
    daysProcessed: daysCount,
    totalCostGenerated,
  };
}

module.exports = { backfillSlotCosts };

