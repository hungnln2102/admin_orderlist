const { db } = require("../../src/db");
const {
  FINANCE_SCHEMA,
  ORDERS_SCHEMA,
  SCHEMA_FINANCE,
  SCHEMA_ORDERS,
  tableName,
} = require("../../src/config/dbSchema");
const { STATUS } = require("../../src/utils/statuses");
const {
  createDateNormalization,
  createNumericExtraction,
  quoteIdent,
} = require("../../src/utils/sql");

const orderTable = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const summaryTable = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);

const orderCols = ORDERS_SCHEMA.ORDER_LIST.COLS;
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const orderDateExpr = createDateNormalization(quoteIdent(orderCols.ORDER_DATE));
const canceledAtExpr = createDateNormalization(quoteIdent(orderCols.CANCELED_AT));
const priceExpr = createNumericExtraction(quoteIdent(orderCols.PRICE));
const costExpr = createNumericExtraction(quoteIdent(orderCols.COST));
const refundExpr = createNumericExtraction(quoteIdent(orderCols.REFUND));

// Revenue/profit uses paid-like statuses. This keeps original month revenue
// even when the order later moves to refund/renewal/expired states.
const revenueStatuses = [
  STATUS.PROCESSING,
  STATUS.PAID,
  STATUS.PENDING_REFUND,
  STATUS.REFUNDED,
  STATUS.RENEWAL,
  STATUS.EXPIRED,
];

const toSqlLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

const revenueStatusSql = revenueStatuses.map(toSqlLiteral).join(", ");

const aggregateSql = `
  WITH normalized_orders AS (
    SELECT
      ${orderDateExpr} AS order_date,
      ${canceledAtExpr} AS canceled_at,
      ${priceExpr} AS price_value,
      ${costExpr} AS cost_value,
      ${refundExpr} AS refund_value,
      TRIM(COALESCE(${quoteIdent(orderCols.STATUS)}::text, '')) AS status_value
    FROM ${orderTable}
  ),
  monthly_orders AS (
    SELECT
      TO_CHAR(date_trunc('month', order_date), 'YYYY-MM') AS month_key,
      COUNT(*) AS total_orders,
      COALESCE(
        SUM(
          CASE
            WHEN status_value = '${STATUS.PAID}' THEN price_value
            ELSE 0
          END
        ),
        0
      ) AS total_revenue,
      COALESCE(
        SUM(
          CASE
            WHEN status_value = '${STATUS.PAID}' THEN price_value - cost_value
            ELSE 0
          END
        ),
        0
      ) AS total_profit
    FROM normalized_orders
    WHERE order_date IS NOT NULL
      AND status_value = '${STATUS.PAID}'
    GROUP BY 1
  ),
  monthly_cancellations AS (
    SELECT
      TO_CHAR(date_trunc('month', canceled_at), 'YYYY-MM') AS month_key,
      COUNT(*) AS canceled_orders,
      COALESCE(SUM(refund_value), 0) AS total_refund
    FROM normalized_orders
    WHERE canceled_at IS NOT NULL
      AND status_value IN ('${STATUS.REFUNDED}', '${STATUS.PENDING_REFUND}')
    GROUP BY 1
  ),
  all_months AS (
    SELECT month_key FROM monthly_orders
    UNION
    SELECT month_key FROM monthly_cancellations
  )
  SELECT
    all_months.month_key AS ${quoteIdent(summaryCols.MONTH_KEY)},
    COALESCE(monthly_orders.total_orders, 0) AS ${quoteIdent(summaryCols.TOTAL_ORDERS)},
    COALESCE(monthly_cancellations.canceled_orders, 0) AS ${quoteIdent(summaryCols.CANCELED_ORDERS)},
    COALESCE(monthly_orders.total_revenue, 0) AS ${quoteIdent(summaryCols.TOTAL_REVENUE)},
    COALESCE(monthly_orders.total_profit, 0) AS ${quoteIdent(summaryCols.TOTAL_PROFIT)},
    COALESCE(monthly_cancellations.total_refund, 0) AS ${quoteIdent(summaryCols.TOTAL_REFUND)}
  FROM all_months
  LEFT JOIN monthly_orders
    ON monthly_orders.month_key = all_months.month_key
  LEFT JOIN monthly_cancellations
    ON monthly_cancellations.month_key = all_months.month_key
  ORDER BY all_months.month_key ASC
`;

async function rebuildDashboardMonthlySummary() {
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
