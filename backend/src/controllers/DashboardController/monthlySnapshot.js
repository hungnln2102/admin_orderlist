/**
 * Doanh thu: cột total_revenue trên dashboard_monthly_summary (cộng dồn khi chèn biên lai, xem trigger).
 * Rebuild: revenueSource = 'receipts' tổng từ payment_receipt (sau khi xóa bảng, đối soát lại).
 * Hoàn/đếm đơn từ CTE order_list. total_import + total_profit (lãi theo từng dòng, sync từ log NCC);
 * cột total_profit trong DB = tổng lãi (gross) trước rút; bảng tháng/KPI: total_profit − rút theo tháng.
 * Thuế trên (doanh thu ròng).
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
  SCHEMA_ORDERS,
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
const orderListTable = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const orderListCols = ORDERS_SCHEMA.ORDER_LIST.COLS;
const paymentReceiptTable = tableName(
  ORDERS_SCHEMA.PAYMENT_RECEIPT.TABLE,
  SCHEMA_RECEIPT
);
const paymentReceiptCols = ORDERS_SCHEMA.PAYMENT_RECEIPT.COLS;
const summaryTableName = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);

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

/**
 * Tổng lãi theo từng dòng tháng (mỗi order_list_id một bản ghi log mới nhất): COALESCE(gross, price) - cost.
 */
const sumNccOrderMarginByMonthKeys = async (monthKeys, executor = db) => {
  const unique = [...new Set((monthKeys || []).map((k) => String(k || "").trim()))].filter(
    Boolean
  );
  if (!unique.length) return new Map();
  const la = quoteIdent(importLogCols.LOGGED_AT);
  const lid = quoteIdent(importLogCols.ORDER_LIST_ID);
  const lId = quoteIdent(importLogCols.ID);
  const olId = quoteIdent(orderListCols.ID);
  const gsp = quoteIdent(orderListCols.GROSS_SELLING_PRICE);
  const price = quoteIdent(orderListCols.PRICE);
  const cost = quoteIdent(orderListCols.COST);
  const placeholders = unique.map(() => "?").join(", ");
  const r = await executor.raw(
    `
    SELECT
      sub.mk,
      COALESCE(SUM(sub.m), 0) AS ncc_margin
    FROM (
      SELECT DISTINCT ON (
        TO_CHAR(DATE_TRUNC('month', l.${la}::timestamptz), 'YYYY-MM'),
        l.${lid}
      )
        TO_CHAR(DATE_TRUNC('month', l.${la}::timestamptz), 'YYYY-MM') AS mk,
        GREATEST(
          0,
          COALESCE(ol.${gsp}::numeric, ol.${price}::numeric, 0) - COALESCE(ol.${cost}::numeric, 0)
        ) AS m
      FROM ${importLogTable} l
      INNER JOIN ${orderListTable} ol ON ol.${olId} = l.${lid}
      WHERE l.${la} IS NOT NULL
        AND TO_CHAR(DATE_TRUNC('month', l.${la}::timestamptz), 'YYYY-MM') IN (${placeholders})
      ORDER BY
        TO_CHAR(DATE_TRUNC('month', l.${la}::timestamptz), 'YYYY-MM'),
        l.${lid},
        l.${lId} DESC
    ) sub
    GROUP BY sub.mk
    `,
    unique
  );
  return new Map(
    (r.rows || []).map((r0) => [String(r0.mk || ""), toNumber(r0.ncc_margin)])
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

const sumRevenueAndImportFromSummaryTable = async (monthKeys, executor = db) => {
  const unique = [...new Set((monthKeys || []).map((k) => String(k || "").trim()))].filter(
    Boolean
  );
  if (!unique.length) return new Map();
  const stored = await executor(summaryTableName)
    .select(
      summaryCols.MONTH_KEY,
      summaryCols.TOTAL_REVENUE,
      summaryCols.TOTAL_IMPORT,
      summaryCols.TOTAL_PROFIT
    )
    .whereIn(summaryCols.MONTH_KEY, unique);
  return new Map(
    (stored || []).map((r) => [
      String(r[summaryCols.MONTH_KEY] || ""),
      {
        revenue: toNumber(r[summaryCols.TOTAL_REVENUE]),
        importVal: toNumber(r[summaryCols.TOTAL_IMPORT]),
        /** Tổng lãi dòng từ trigger NCC, trước rút lợi nhuận. */
        margin: toNumber(r[summaryCols.TOTAL_PROFIT]),
      },
    ])
  );
};

/**
 * @param {import("knex").Knex|import("knex").Transaction} [executor]
 * @param {{ revenueSource?: 'table' | 'receipts' }} [options] — rebuild sau TRUNC: 'receipts' (tổng từ biên lai);
 *   mặc định 'table' (đọc cột cộng dồn từ trigger).
 */
const buildAlignedMonthlyRows = async (executor = db, options = {}) => {
  const revenueSource = options.revenueSource === "receipts" ? "receipts" : "table";
  const useCreatedAt = await orderListHasCreatedAtColumn();
  const result = await executor.raw(
    buildDashboardSummaryAggregateQuery(summaryCols, { useCreatedAt })
  );
  const rows = result.rows || [];
  if (rows.length === 0) return [];

  const mks = rows
    .map((row) => String(row[summaryCols.MONTH_KEY] || "").trim())
    .filter(Boolean);

  const withdrawMapF = await sumWithdrawProfitByMonthKeys(mks, executor);
  let revImpByMonth;
  if (revenueSource === "receipts") {
    const [revMap, impMap, nccMap] = await Promise.all([
      sumPaymentReceiptsByMonthKeys(mks, executor),
      sumImportCostByMonthKeys(mks, executor),
      sumNccOrderMarginByMonthKeys(mks, executor),
    ]);
    revImpByMonth = (mk) => ({
      rev: revMap.get(mk) || 0,
      imp: impMap.get(mk) || 0,
      nccMargin: nccMap.get(mk) || 0,
    });
  } else {
    const tbl = await sumRevenueAndImportFromSummaryTable(mks, executor);
    revImpByMonth = (mk) => {
      const t = tbl.get(mk);
      return {
        rev: t ? t.revenue : 0,
        imp: t ? t.importVal : 0,
        nccMargin: t ? t.margin : 0,
      };
    };
  }

  return rows.map((row) => {
    const mk = String(row[summaryCols.MONTH_KEY] || "");
    const { rev, imp: importVal, nccMargin } = revImpByMonth(mk);
    const refund = toNumber(row[summaryCols.TOTAL_REFUND]);
    const withdraw = withdrawMapF.get(mk) || 0;
    const profitGross = nccMargin;
    const profitForDisplay = profitGross - withdraw;
    return {
      [summaryCols.MONTH_KEY]: mk,
      [summaryCols.TOTAL_ORDERS]: toNumber(row[summaryCols.TOTAL_ORDERS]),
      [summaryCols.CANCELED_ORDERS]: toNumber(row[summaryCols.CANCELED_ORDERS]),
      [summaryCols.TOTAL_REVENUE]: rev,
      [summaryCols.TOTAL_PROFIT]: revenueSource === "receipts" ? profitGross : profitForDisplay,
      [summaryCols.TOTAL_REFUND]: refund,
      [summaryCols.TOTAL_IMPORT]: importVal,
      [summaryCols.TOTAL_TAX]: taxOnNet(rev, refund),
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
  sumNccOrderMarginByMonthKeys,
  sumRevenueAndImportFromSummaryTable,
  sumWithdrawProfitByMonthKeys,
  rowToApiShape,
  toNumber,
  taxOnNet,
};
