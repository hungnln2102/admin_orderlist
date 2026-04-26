const { db } = require("../../src/db");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../src/config/dbSchema");
const { buildDashboardSummaryAggregateQuery } = require("../../src/controllers/DashboardController/dashboardSummaryAggregate");
const {
  orderListHasCreatedAtColumn,
} = require("../../src/controllers/DashboardController/orderListHasCreatedAtColumn");

const summaryTable = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

async function rebuildDashboardMonthlySummary() {
  const useCreatedAt = await orderListHasCreatedAtColumn();
  const aggregateSql = buildDashboardSummaryAggregateQuery(summaryCols, {
    useCreatedAt,
  });
  const trx = await db.transaction();

  try {
    const result = await trx.raw(aggregateSql);
    const rows = result.rows || [];

    await trx(summaryTable).del();

    if (rows.length > 0) {
      await trx(summaryTable).insert(
        rows.map((row) => ({
          [summaryCols.MONTH_KEY]: row[summaryCols.MONTH_KEY],
          [summaryCols.TOTAL_ORDERS]: Number(row[summaryCols.TOTAL_ORDERS]) || 0,
          [summaryCols.CANCELED_ORDERS]: Number(row[summaryCols.CANCELED_ORDERS]) || 0,
          [summaryCols.TOTAL_REVENUE]: Number(row[summaryCols.TOTAL_REVENUE]) || 0,
          [summaryCols.TOTAL_PROFIT]: Number(row[summaryCols.TOTAL_PROFIT]) || 0,
          [summaryCols.TOTAL_REFUND]: Number(row[summaryCols.TOTAL_REFUND]) || 0,
        }))
      );
    }

    await trx.commit();

    console.log(
      `[dashboard-summary] Rebuilt ${rows.length} month rows into ${summaryTable}`
    );
    if (rows.length > 0) {
      console.table(
        rows.map((row) => ({
          month_key: row[summaryCols.MONTH_KEY],
          total_orders: Number(row[summaryCols.TOTAL_ORDERS]) || 0,
          canceled_orders: Number(row[summaryCols.CANCELED_ORDERS]) || 0,
          total_revenue: Number(row[summaryCols.TOTAL_REVENUE]) || 0,
          total_profit: Number(row[summaryCols.TOTAL_PROFIT]) || 0,
          total_refund: Number(row[summaryCols.TOTAL_REFUND]) || 0,
        }))
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
