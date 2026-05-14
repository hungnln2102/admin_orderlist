const { db } = require("../../db");
const {
  tableName,
  SCHEMA_FINANCE,
  FINANCE_SCHEMA,
} = require("../../config/dbSchema");

const summaryTableName = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const toNumber = (value) => Number(value || 0);

/**
 * Số dư bank ước tính: đọc trực tiếp từ cột `estimated_bank_balance`
 * trong `dashboard_monthly_summary` theo tháng hiện tại/tháng trước.
 */
const fetchEstimatedBankBalancePair = async ({ currentMonthKey, previousMonthKey }) => {
  if (!currentMonthKey || !previousMonthKey) {
    return { current: 0, previous: 0 };
  }
  const rows = await db(summaryTableName)
    .select(summaryCols.MONTH_KEY, summaryCols.ESTIMATED_BANK_BALANCE)
    .whereIn(summaryCols.MONTH_KEY, [currentMonthKey, previousMonthKey]);
  const byMonth = new Map(
    (rows || []).map((row) => [
      String(row?.[summaryCols.MONTH_KEY] || "").trim(),
      toNumber(row?.[summaryCols.ESTIMATED_BANK_BALANCE]),
    ])
  );
  return {
    current: byMonth.get(currentMonthKey) || 0,
    previous: byMonth.get(previousMonthKey) || 0,
  };
};

module.exports = {
  fetchEstimatedBankBalancePair,
  // Backward-compatible alias (old name).
  fetchAvailableProfitPair: fetchEstimatedBankBalancePair,
};
