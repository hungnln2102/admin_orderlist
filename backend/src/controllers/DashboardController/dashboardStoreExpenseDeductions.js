const { db } = require("../../db");
const {
  tableName,
  SCHEMA_FINANCE,
  FINANCE_SCHEMA,
} = require("../../config/dbSchema");

const expenseTableName = tableName(
  FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE,
  SCHEMA_FINANCE
);
const expenseCols = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;

/**
 * Gộp `mavn_import` + `external_import` theo tháng `created_at` (báo cáo / đối soát).
 * Lợi nhuận tháng trên API đọc `dashboard_monthly_summary.total_profit` (đã gồm MAVN + external khi đồng bộ);
 * xem `dashboardSummary.js` / trigger NCC và `applyExternalImportProfitDelta`.
 */
const IMPORT_ADJUSTMENT_TYPES = ["mavn_import", "external_import"];
const WITHDRAW_TYPE = "withdraw_profit";

const toNumber = (value) => Number(value || 0);

/**
 * Tổng `mavn_import` + `external_import` gom theo tháng lịch của `created_at` (YYYY-MM).
 * @param {string[] | null | undefined} monthKeys — `null`/thiếu: không lọc (mọi tháng có dòng).
 * @param {import("knex").Knex} [executor]
 */
const sumMavnExternalByExpenseMonth = async (monthKeys, executor = db) => {
  const q = executor(expenseTableName)
    .select(
      executor.raw(
        `TO_CHAR(DATE_TRUNC('month', ${expenseCols.CREATED_AT}::timestamptz), 'YYYY-MM') AS mk`
      ),
      executor.raw(`COALESCE(SUM(${expenseCols.AMOUNT}::numeric), 0) AS total`)
    )
    .whereIn(expenseCols.EXPENSE_TYPE, IMPORT_ADJUSTMENT_TYPES)
    .groupByRaw(
      `TO_CHAR(DATE_TRUNC('month', ${expenseCols.CREATED_AT}::timestamptz), 'YYYY-MM')`
    );

  if (Array.isArray(monthKeys) && monthKeys.length) {
    q.whereRaw(
      `TO_CHAR(DATE_TRUNC('month', ${expenseCols.CREATED_AT}::timestamptz), 'YYYY-MM') IN (${monthKeys.map(() => "?").join(", ")})`,
      monthKeys
    );
  }

  const rows = await q;
  const map = new Map();
  for (const r of rows || []) {
    const mk = String(r.mk || "").trim();
    if (mk) map.set(mk, toNumber(r.total));
  }
  return map;
};

const sumWithdrawAllTime = () =>
  db(expenseTableName)
    .where(expenseCols.EXPENSE_TYPE, WITHDRAW_TYPE)
    .sum({ total: expenseCols.AMOUNT })
    .first()
    .then((row) => toNumber(row?.total));

const sumWithdrawBeforeYmd = (beforeYmd) =>
  db(expenseTableName)
    .where(expenseCols.EXPENSE_TYPE, WITHDRAW_TYPE)
    .whereRaw(`DATE(${expenseCols.CREATED_AT}) < ?`, [beforeYmd])
    .sum({ total: expenseCols.AMOUNT })
    .first()
    .then((row) => toNumber(row?.total));

/** Trừ tổng các tháng trong `keys` (mỗi tháng một số trong map). */
const deductionTotalForMonthKeys = (keys, dedMap) =>
  (keys || []).reduce((s, k) => s + (dedMap.get(String(k).trim()) || 0), 0);

module.exports = {
  IMPORT_ADJUSTMENT_TYPES,
  WITHDRAW_TYPE,
  sumMavnExternalByExpenseMonth,
  sumWithdrawAllTime,
  sumWithdrawBeforeYmd,
  deductionTotalForMonthKeys,
};
