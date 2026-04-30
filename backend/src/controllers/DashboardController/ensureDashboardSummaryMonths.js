/**
 * Backfill `dashboard_monthly_summary` khi thiếu `month_key` (ops / script rebuild),
 * không gọi từ API dashboard đọc số: thiếu hàng thì coi như chưa có dữ liệu (0).
 *
 * Nguồn khi chèn: cùng công thức rebuild (`buildAlignedMonthlyRows` + biên lai),
 * hoặc tối thiểu từ biên lai / log NCC nếu tháng không có trong aggregate đơn.
 */
const logger = require("../../utils/logger");
const {
  tableName,
  FINANCE_SCHEMA,
  SCHEMA_FINANCE,
} = require("../../config/dbSchema");
const {
  buildAlignedMonthlyRows,
  sumPaymentReceiptsByMonthKeys,
  sumImportCostByMonthKeys,
  sumNccOrderMarginByMonthKeys,
  taxOnNet,
} = require("./monthlySnapshot");

const summaryTableName = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

const normalizeKeys = (monthKeys) => {
  const out = new Set();
  for (const raw of monthKeys || []) {
    const k = String(raw || "").trim();
    if (MONTH_KEY_RE.test(k)) out.add(k);
  }
  return [...out];
};

const buildMinimalMonthRowFromReceipts = async (executor, monthKey) => {
  const [revMap, impMap, nccMap] = await Promise.all([
    sumPaymentReceiptsByMonthKeys([monthKey], executor),
    sumImportCostByMonthKeys([monthKey], executor),
    sumNccOrderMarginByMonthKeys([monthKey], executor),
  ]);
  const rev = Number(revMap.get(monthKey)) || 0;
  const refund = 0;
  return {
    [summaryCols.MONTH_KEY]: monthKey,
    [summaryCols.TOTAL_ORDERS]: 0,
    [summaryCols.CANCELED_ORDERS]: 0,
    [summaryCols.TOTAL_REVENUE]: rev,
    [summaryCols.TOTAL_PROFIT]: Number(nccMap.get(monthKey)) || 0,
    [summaryCols.TOTAL_REFUND]: refund,
    [summaryCols.TOTAL_IMPORT]: Number(impMap.get(monthKey)) || 0,
    [summaryCols.TOTAL_TAX]: taxOnNet(rev, refund),
    [summaryCols.UPDATED_AT]: executor.raw("now()"),
  };
};

/**
 * @param {import("knex").Knex} executor
 * @param {string[]} monthKeys — các `YYYY-MM` cần đảm bảo có hàng
 * @returns {{ months: string[] }} — các tháng vừa xử lý chèn (seed); có thể đã tồn tại nhờ race ON CONFLICT DO NOTHING
 */
const ensureDashboardSummaryMonthRowsPresent = async (executor, monthKeys) => {
  const keys = normalizeKeys(monthKeys);
  if (!keys.length) return { months: [] };

  const existing = await executor(summaryTableName)
    .select(summaryCols.MONTH_KEY)
    .whereIn(summaryCols.MONTH_KEY, keys);
  const have = new Set(
    (existing || []).map((r) => String(r[summaryCols.MONTH_KEY] || "").trim())
  );
  const missing = keys.filter((k) => !have.has(k));
  if (!missing.length) return { months: [] };

  const alignedAll = await buildAlignedMonthlyRows(executor, {
    revenueSource: "receipts",
  });
  const byMk = new Map(
    (alignedAll || []).map((r) => [String(r[summaryCols.MONTH_KEY] || "").trim(), r])
  );

  for (const mk of missing) {
    let row = byMk.get(mk);
    if (!row) {
      row = await buildMinimalMonthRowFromReceipts(executor, mk);
    } else {
      row = {
        ...row,
        [summaryCols.UPDATED_AT]: executor.raw("now()"),
      };
    }
    try {
      await executor(summaryTableName)
        .insert(row)
        .onConflict(summaryCols.MONTH_KEY)
        .ignore();
    } catch (err) {
      logger.warn("[dashboard] ensureSummaryMonths insert failed", {
        monthKey: mk,
        error: err.message,
      });
    }
  }

  if (missing.length) {
    logger.info("[dashboard] Upserted dashboard_monthly_summary seed rows", {
      months: missing,
    });
  }
  return { months: missing };
};

module.exports = {
  ensureDashboardSummaryMonthRowsPresent,
  normalizeMonthKeysForSummary: normalizeKeys,
};
