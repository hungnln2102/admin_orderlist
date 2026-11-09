/**
 * Synchronizes committed vacant-slot cost deltas to finance projections.
 */
const { accumulateDailySummary } = require("@/domains/dashboard/services/dailySummaryService");
const { financeNotifier } = require("@/domains/notifications/telegram");
const { getVietnamMonthString } = require("@/utils/time");

async function syncSlotCostFinanceDelta({
  date,
  costDelta,
  totalVacantSlots,
  totalVacantCost,
}) {
  if (costDelta === 0) return;

  try {
    await accumulateDailySummary(date, {
      total_shop_cost: costDelta,
      slot_vacant_cost: costDelta,
    });

    const monthKey = getVietnamMonthString(date);
    await financeNotifier.notifyFinanceMonthlyDelta({
      monthKey,
      importDelta: costDelta,
      profitDelta: -costDelta,
      context: `Chi phí slot trống Kho Gói ngày ${date} (${totalVacantSlots} slot trống, ${totalVacantCost.toLocaleString()} đ)`,
    });
  } catch (error) {
    console.error("[SlotCostService] Lỗi đồng bộ tài chính ngày:", error.message);
  }
}

module.exports = { syncSlotCostFinanceDelta };
