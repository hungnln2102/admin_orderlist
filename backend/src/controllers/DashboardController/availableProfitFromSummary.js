const { db } = require("../../db");
const {
  tableName,
  SCHEMA_FINANCE,
  FINANCE_SCHEMA,
} = require("../../config/dbSchema");
const {
  sumWithdrawAllTime,
  sumWithdrawBeforeYmd,
} = require("./dashboardStoreExpenseDeductions");

const summaryTableName = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const toNumber = (value) => Number(value || 0);

/**
 * Lợi nhuận khả dụng (Tổng quan): `SUM(total_profit)` trên `dashboard_monthly_summary`
 * trừ **duy nhất** các khoản `withdraw_profit` trong `store_profit_expenses`
 * (`sumWithdrawAllTime` / `sumWithdrawBeforeYmd`).
 *
 * MAVN (âm cost) và `external_import` đã phản ánh trong `total_profit`; không trừ lại ở đây.
 */
const fetchAvailableProfitPair = async ({ currentMonthKey, monthStartDate }) => {
  const [profitAllRow, profitBeforeRow, withdrawAll, withdrawBefore] =
    await Promise.all([
      db(summaryTableName)
        .sum({ total: summaryCols.TOTAL_PROFIT })
        .first(),
      db(summaryTableName)
        .where(summaryCols.MONTH_KEY, "<", currentMonthKey)
        .sum({ total: summaryCols.TOTAL_PROFIT })
        .first(),
      sumWithdrawAllTime(),
      sumWithdrawBeforeYmd(monthStartDate),
    ]);

  const profitAll = toNumber(profitAllRow?.total);
  const profitBefore = toNumber(profitBeforeRow?.total);

  return {
    current: profitAll - withdrawAll,
    previous: profitBefore - withdrawBefore,
  };
};

module.exports = { fetchAvailableProfitPair };
