/**
 * Cùng một nguồn số: doanh thu = tổng biên lai (Sepay) theo tháng payment_date;
 * hoàn/đếm đơn từ CTE order_list; nhập từ log NCC; lợi nhuận = (sepay - hoàn) - nhập - rút lợi nhuận;
 * thuế trên (sepay - hoàn). Dùng cho API tóm tắt tháng, biểu đồ từ summary, và script rebuild bảng.
 */
const { db } = require("../../db");
const { buildDashboardSummaryAggregateQuery } = require("./dashboardSummaryAggregate");
const { orderListHasCreatedAtColumn } = require("./orderListHasCreatedAtColumn");
const { quoteIdent } = require("../../utils/sql");
const { dashboardMonthlyTaxRatePercent } = require("../../config/appConfig");
const {
  tableName,
  FINANCE_SCHEMA,
  SCHEMA_FINANCE,
  ORDERS_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_PARTNER,
  SCHEMA_RECEIPT,
} = require("../../config/dbSchema");

const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const expenseTableName = tableName(
  FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE,
  SCHEMA_FINANCE
);
const expenseCols = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;
const importLogTable = tableName(
  PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE,
  SCHEMA_PARTNER
);
const importLogCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;
const paymentReceiptTable = tableName(
  ORDERS_SCHEMA.PAYMENT_RECEIPT.TABLE,
  SCHEMA_RECEIPT
);
const paymentReceiptCols = ORDERS_SCHEMA.PAYMENT_RECEIPT.COLS;

const toNumber = (value) => Number(value || 0);

const taxOnNet = (sepay, refund) =>
  Math.round(
    (toNumber(sepay) - toNumber(refund)) *
      (Number(dashboardMonthlyTaxRatePercent) / 100)
  );

const sumPaymentReceiptsByMonthKeys = async (monthKeys, executor = db) => {
  const unique = [...new Set((monthKeys || []).map((k) => String(k || "").trim()))].filter(
    Boolean
  );
  if (!unique.length) return new Map();
  const cPaid = quoteIdent(paymentReceiptCols.PAID_DATE);
  const cAmt = quoteIdent(paymentReceiptCols.AMOUNT);
  const placeholders = unique.map(() => "?").join(", ");
  const r = await executor.raw(
    `
    SELECT
      TO_CHAR(DATE_TRUNC('month', pr.${cPaid}::date), 'YYYY-MM') AS month_key,
      COALESCE(SUM(pr.${cAmt}::numeric), 0) AS sepay_sum
    FROM ${paymentReceiptTable} pr
    WHERE pr.${cPaid} IS NOT NULL
      AND TO_CHAR(DATE_TRUNC('month', pr.${cPaid}::date), 'YYYY-MM') IN (${placeholders})
    GROUP BY 1
    `,
    unique
  );
  return new Map(
    (r.rows || []).map((row) => [String(row.month_key || ""), toNumber(row.sepay_sum)])
  );
};

const sumImportCostByMonthKeys = async (monthKeys, executor = db) => {
  const unique = [...new Set((monthKeys || []).map((k) => String(k || "").trim()))].filter(
    Boolean
  );
  if (!unique.length) return new Map();
  const la = quoteIdent(importLogCols.LOGGED_AT);
  const ic = quoteIdent(importLogCols.IMPORT_COST);
  const placeholders = unique.map(() => "?").join(", ");
  const r = await executor.raw(
    `
    SELECT
      TO_CHAR(DATE_TRUNC('month', ${la}::timestamptz), 'YYYY-MM') AS mk,
      COALESCE(SUM(${ic}::numeric), 0) AS total_import
    FROM ${importLogTable}
    WHERE ${la} IS NOT NULL
      AND TO_CHAR(DATE_TRUNC('month', ${la}::timestamptz), 'YYYY-MM') IN (${placeholders})
    GROUP BY 1
    `,
    unique
  );
  return new Map(
    (r.rows || []).map((r0) => [String(r0.mk || ""), toNumber(r0.total_import)])
  );
};

const sumWithdrawProfitByMonthKeys = async (monthKeys, executor = db) => {
  const unique = [...new Set((monthKeys || []).map((k) => String(k || "").trim()))].filter(
    Boolean
  );
  if (!unique.length) return new Map();
  const cAt = quoteIdent(expenseCols.CREATED_AT);
  const cAmt = quoteIdent(expenseCols.AMOUNT);
  const cType = quoteIdent(expenseCols.EXPENSE_TYPE);
  const placeholders = unique.map(() => "?").join(", ");
  const r = await executor.raw(
    `
    SELECT
      TO_CHAR(DATE_TRUNC('month', e.${cAt}::date), 'YYYY-MM') AS mk,
      COALESCE(SUM(e.${cAmt}::numeric), 0) AS w
    FROM ${expenseTableName} e
    WHERE e.${cType} = 'withdraw_profit'
      AND e.${cAt} IS NOT NULL
      AND TO_CHAR(DATE_TRUNC('month', e.${cAt}::date), 'YYYY-MM') IN (${placeholders})
    GROUP BY 1
    `,
    unique
  );
  return new Map((r.rows || []).map((r0) => [String(r0.mk || ""), toNumber(r0.w)]));
};

/**
 * Một dòng tổng hợp theo tháng (cùng logic thẻ KPI + lưu DB sau rebuild).
 * @param {import("knex").Knex|import("knex").Transaction} [executor]
 */
const buildAlignedMonthlyRows = async (executor = db) => {
  const useCreatedAt = await orderListHasCreatedAtColumn();
  const result = await executor.raw(
    buildDashboardSummaryAggregateQuery(summaryCols, { useCreatedAt })
  );
  const rows = result.rows || [];
  if (rows.length === 0) return [];

  const mks = rows
    .map((row) => String(row[summaryCols.MONTH_KEY] || "").trim())
    .filter(Boolean);

  const [sepayMap, importMap, withdrawMap] = await Promise.all([
    sumPaymentReceiptsByMonthKeys(mks, executor),
    sumImportCostByMonthKeys(mks, executor),
    sumWithdrawProfitByMonthKeys(mks, executor),
  ]);

  return rows.map((row) => {
    const mk = String(row[summaryCols.MONTH_KEY] || "");
    const sepay = sepayMap.get(mk) || 0;
    const refund = toNumber(row[summaryCols.TOTAL_REFUND]);
    const importVal = importMap.get(mk) || 0;
    const withdraw = withdrawMap.get(mk) || 0;
    const net = sepay - refund;
    const profit = net - importVal - withdraw;
    return {
      [summaryCols.MONTH_KEY]: mk,
      [summaryCols.TOTAL_ORDERS]: toNumber(row[summaryCols.TOTAL_ORDERS]),
      [summaryCols.CANCELED_ORDERS]: toNumber(row[summaryCols.CANCELED_ORDERS]),
      [summaryCols.TOTAL_REVENUE]: sepay,
      [summaryCols.TOTAL_PROFIT]: profit,
      [summaryCols.TOTAL_REFUND]: refund,
      [summaryCols.TOTAL_IMPORT]: importVal,
      [summaryCols.TOTAL_TAX]: taxOnNet(sepay, refund),
    };
  });
};

/**
 * Các trường trả về cho API (camel/snake ổn định) — một hàng từ buildAlignedMonthlyRows.
 */
const rowToApiShape = (dbRow) => {
  const mk = String(dbRow[summaryCols.MONTH_KEY] || "");
  const sepay = toNumber(dbRow[summaryCols.TOTAL_REVENUE]);
  const refund = toNumber(dbRow[summaryCols.TOTAL_REFUND]);
  return {
    month_key: mk,
    total_orders: toNumber(dbRow[summaryCols.TOTAL_ORDERS]),
    canceled_orders: toNumber(dbRow[summaryCols.CANCELED_ORDERS]),
    total_revenue: sepay,
    total_profit: toNumber(dbRow[summaryCols.TOTAL_PROFIT]),
    total_refund: refund,
    total_import: toNumber(dbRow[summaryCols.TOTAL_IMPORT]),
    total_tax: toNumber(dbRow[summaryCols.TOTAL_TAX]),
  };
};

module.exports = {
  buildAlignedMonthlyRows,
  sumPaymentReceiptsByMonthKeys,
  sumImportCostByMonthKeys,
  sumWithdrawProfitByMonthKeys,
  rowToApiShape,
  toNumber,
  taxOnNet,
};
