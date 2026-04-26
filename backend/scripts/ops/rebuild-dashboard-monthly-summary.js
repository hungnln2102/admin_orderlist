const { db } = require("../../src/db");
const {
  FINANCE_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_FINANCE,
  SCHEMA_PARTNER,
  tableName,
} = require("../../src/config/dbSchema");
const { buildDashboardSummaryAggregateQuery } = require("../../src/controllers/DashboardController/dashboardSummaryAggregate");
const {
  orderListHasCreatedAtColumn,
} = require("../../src/controllers/DashboardController/orderListHasCreatedAtColumn");
const { quoteIdent } = require("../../src/utils/sql");
const { dashboardMonthlyTaxRatePercent } = require("../../src/config/appConfig");

const taxFromRevenue = (revenue) =>
  Math.round(
    (Number(revenue) || 0) * (Number(dashboardMonthlyTaxRatePercent) / 100)
  );

const summaryTable = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const importLogTable = tableName(
  PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE,
  SCHEMA_PARTNER
);
const importLogCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;

async function rebuildDashboardMonthlySummary() {
  const useCreatedAt = await orderListHasCreatedAtColumn();
  const aggregateSql = buildDashboardSummaryAggregateQuery(summaryCols, {
    useCreatedAt,
  });
  const trx = await db.transaction();

  try {
    const result = await trx.raw(aggregateSql);
    const rows = result.rows || [];

    const la = quoteIdent(importLogCols.LOGGED_AT);
    const ic = quoteIdent(importLogCols.IMPORT_COST);
    const importAgg = await trx.raw(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', ${la}::timestamptz), 'YYYY-MM') AS mk,
        COALESCE(SUM(${ic}::numeric), 0) AS total_import
      FROM ${importLogTable}
      WHERE ${la} IS NOT NULL
      GROUP BY 1`
    );
    const importByMonth = new Map(
      (importAgg.rows || []).map((r) => [String(r.mk || ""), Number(r.total_import) || 0])
    );

    await trx(summaryTable).del();

    if (rows.length > 0) {
      await trx(summaryTable).insert(
        rows.map((row) => {
          const mk = String(row[summaryCols.MONTH_KEY] || "");
          const totalRev = Number(row[summaryCols.TOTAL_REVENUE]) || 0;
          return {
            [summaryCols.MONTH_KEY]: mk,
            [summaryCols.TOTAL_ORDERS]: Number(row[summaryCols.TOTAL_ORDERS]) || 0,
            [summaryCols.CANCELED_ORDERS]: Number(row[summaryCols.CANCELED_ORDERS]) || 0,
            [summaryCols.TOTAL_REVENUE]: totalRev,
            [summaryCols.TOTAL_PROFIT]: Number(row[summaryCols.TOTAL_PROFIT]) || 0,
            [summaryCols.TOTAL_REFUND]: Number(row[summaryCols.TOTAL_REFUND]) || 0,
            [summaryCols.TOTAL_IMPORT]: importByMonth.get(mk) || 0,
            [summaryCols.TOTAL_TAX]: taxFromRevenue(totalRev),
          };
        })
      );
    }

    await trx.commit();

    console.log(
      `[dashboard-summary] Rebuilt ${rows.length} month rows into ${summaryTable}`
    );
    if (rows.length > 0) {
      console.table(
        rows.map((row) => {
          const mk = String(row[summaryCols.MONTH_KEY] || "");
          const totalRev = Number(row[summaryCols.TOTAL_REVENUE]) || 0;
          return {
            month_key: mk,
            total_orders: Number(row[summaryCols.TOTAL_ORDERS]) || 0,
            canceled_orders: Number(row[summaryCols.CANCELED_ORDERS]) || 0,
            total_revenue: totalRev,
            total_profit: Number(row[summaryCols.TOTAL_PROFIT]) || 0,
            total_refund: Number(row[summaryCols.TOTAL_REFUND]) || 0,
            total_import: importByMonth.get(mk) || 0,
            total_tax: taxFromRevenue(totalRev),
          };
        })
      );
    }
  } catch (error) {
    await trx.rollback();
    console.error("[dashboard-summary] Rebuild failed:", error.message);
    throw error;
  } finally {
    await db.destroy().catch(() => {});
  }
}

if (require.main === module) {
  rebuildDashboardMonthlySummary().catch(() => {
    process.exitCode = 1;
  });
}

module.exports = {
  rebuildDashboardMonthlySummary,
};
