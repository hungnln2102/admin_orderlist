const logger = require("@/utils/logger");
const {
  mergeSummaryUpdates,
} = require("@/domains/orders/controller/finance/dashboardSummary");
const {
  notifyFinanceMonthlyDelta,
} = require("@/services/telegramFinanceDeltaNotifier");
const { SUMMARY_COLS, fetchMonthlyTotals } = require("@/domains/supplier-change/repository");
const { FLOWS, STATUSES_NEEDING_NCC_LOG } = require("@/domains/supplier-change/service/constants");

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function monthKeyFromToday(todayYmd) {
  const s = String(todayYmd || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 7);
  return null;
}

async function fetchMonthlySnapshotSafe(trx, monthKey) {
  try {
    const row = await fetchMonthlyTotals(trx, monthKey);
    if (!row) return null;
    return {
      total_revenue: toNum(row[SUMMARY_COLS.TOTAL_REVENUE]),
      total_profit: toNum(row[SUMMARY_COLS.TOTAL_PROFIT]),
      total_import: toNum(row[SUMMARY_COLS.TOTAL_IMPORT]),
      total_refund: toNum(row[SUMMARY_COLS.TOTAL_REFUND]),
    };
  } catch {
    return null;
  }
}

async function applyProfitDeltaOnCostChange(
  trx,
  { orderId, oldCost, newCost, orderStatus, monthKey, effectiveOldCostRefund }
) {
  if (!STATUSES_NEEDING_NCC_LOG.has(orderStatus)) return 0;
  if (!monthKey) return 0;
  // Khi có effectiveOldCostRefund (prorated refund từ NCC cũ), dùng nó thay vì full oldCost.
  // Profit delta = phần cost được hoàn lại (tiết kiệm) - cost NCC mới phải trả.
  const recoveredCost = effectiveOldCostRefund != null
    ? Number(effectiveOldCostRefund)
    : Number(oldCost || 0);
  const delta = recoveredCost - Number(newCost || 0);
  if (!Number.isFinite(delta) || delta === 0) return 0;
  await mergeSummaryUpdates(
    trx,
    monthKey,
    { total_profit: delta },
    { notify: false, context: "supplier-change.applyProfitDelta" }
  );
  logger.info("[supplier-change] applied profit delta", {
    orderId,
    monthKey,
    oldCost,
    newCost,
    effectiveOldCostRefund: effectiveOldCostRefund ?? "(not set, using oldCost)",
    profitDelta: delta,
  });
  return delta;
}

async function notifyMonthlyDeltaSafe(trx, { monthKey, orderId, flow, beforeSnap }) {
  if (!monthKey || !flow || flow === FLOWS.NOOP) return;
  try {
    const afterSnap = await fetchMonthlySnapshotSafe(trx, monthKey);
    const revenueDelta = toNum(afterSnap?.total_revenue) - toNum(beforeSnap?.total_revenue);
    const profitDelta = toNum(afterSnap?.total_profit) - toNum(beforeSnap?.total_profit);
    const importDelta = toNum(afterSnap?.total_import) - toNum(beforeSnap?.total_import);
    const refundDelta = toNum(afterSnap?.total_refund) - toNum(beforeSnap?.total_refund);
    if (revenueDelta || profitDelta || importDelta || refundDelta) {
      await notifyFinanceMonthlyDelta({
        monthKey,
        revenueDelta,
        profitDelta,
        importDelta,
        refundDelta,
        context: `supplier-change[order=${orderId}, flow=${flow}]`,
        executor: trx,
      });
    }
  } catch (notifyErr) {
    logger.warn("[supplier-change] notify finance delta failed (non-fatal)", {
      orderId,
      error: notifyErr?.message,
    });
  }
}

module.exports = {
  monthKeyFromToday,
  fetchMonthlySnapshotSafe,
  applyProfitDeltaOnCostChange,
  notifyMonthlyDeltaSafe,
};
