const {
  FINANCE_SCHEMA,
  SCHEMA_FINANCE,
  tableName,
} = require("../../../../config/dbSchema");
const {
  normalizeDateInput,
  todayYMDInVietnam,
} = require("../../../../utils/normalizers");

const dailySummaryTable = tableName(
  FINANCE_SCHEMA.DAILY_REVENUE_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const dailyCols = FINANCE_SCHEMA.DAILY_REVENUE_SUMMARY.COLS;

const normalizeMoney = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric);
};

const resolveSummaryDate = (value) => {
  const normalized = normalizeDateInput(value);
  return normalized || todayYMDInVietnam();
};

/**
 * Cộng dồn `revenue_reversed` theo ngày.
 * Mục tiêu: khi trong ngày có nhiều đơn hoàn, số tiền cần hoàn được cộng dồn vào cùng `summary_date`.
 */
const addDailyRevenueReversed = async (trx, { summaryDate, amount }) => {
  const delta = normalizeMoney(amount);
  if (delta <= 0) return;

  const ymd = resolveSummaryDate(summaryDate);
  await trx.raw(
    `
      INSERT INTO ${dailySummaryTable} (
        ${dailyCols.SUMMARY_DATE},
        ${dailyCols.REVENUE_REVERSED},
        ${dailyCols.CREATED_AT},
        ${dailyCols.UPDATED_AT}
      )
      VALUES (?::date, ?, NOW(), NOW())
      ON CONFLICT (${dailyCols.SUMMARY_DATE})
      DO UPDATE SET
        ${dailyCols.REVENUE_REVERSED} = ${dailySummaryTable}.${dailyCols.REVENUE_REVERSED} + EXCLUDED.${dailyCols.REVENUE_REVERSED},
        ${dailyCols.UPDATED_AT} = NOW()
    `,
    [ymd, delta]
  );
};

module.exports = {
  addDailyRevenueReversed,
};
