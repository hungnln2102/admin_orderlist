const {
  o,
  orderTable,
  orderCols,
  quoteIdent,
  orderDateExpr,
  canceledAtExpr,
  priceExpr,
  costExpr,
  refundExpr,
  orderCountedSql,
  refundCountedSql,
  idOrderMatchesSalesSql,
  makeBirthDateExpr,
  makeEventDateExpr,
  revenueByEventValueExpr,
  profitByEventValueExpr,
} = require("@/controllers/DashboardController/summaryQueries/constants");

/**
 * Cùng SELECT như rebuild dashboard_monthly_summary; cột tên theo bảng finance.
 * @param {{ useCreatedAt?: boolean }} [options] — mặc định false nếu DB chưa có cột created_at.
 */
const buildDashboardSummaryAggregateQuery = (summaryCols, options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  const birthDateExpr = makeBirthDateExpr(useCreatedAt);
  const eventDateExpr = makeEventDateExpr(birthDateExpr);
  const monthKeyId = quoteIdent(summaryCols.MONTH_KEY);
  const totalOrdersId = quoteIdent(summaryCols.TOTAL_ORDERS);
  const canceledId = quoteIdent(summaryCols.CANCELED_ORDERS);
  const totalRevId = quoteIdent(summaryCols.TOTAL_REVENUE);
  const totalProfitId = quoteIdent(summaryCols.TOTAL_PROFIT);
  const totalRefundId = quoteIdent(summaryCols.TOTAL_REFUND);

  return `
  WITH normalized_orders AS (
    SELECT
      ${orderDateExpr} AS order_date,
      ${canceledAtExpr} AS canceled_at,
      ${priceExpr} AS price_value,
      ${costExpr} AS cost_value,
      ${refundExpr} AS refund_value,
      TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) AS status_value,
      UPPER(TRIM(COALESCE(${o}.${quoteIdent(orderCols.ID_ORDER)}::text, ''))) AS id_order_upper,
      ${birthDateExpr} AS birth_date,
      ${eventDateExpr} AS event_date
    FROM ${orderTable} ${o}
  ),
  monthly_event AS (
    SELECT
      TO_CHAR(date_trunc('month', event_date), 'YYYY-MM') AS month_key,
      COALESCE(SUM(${revenueByEventValueExpr}), 0) AS ${totalRevId},
      COALESCE(SUM(${profitByEventValueExpr}), 0) AS ${totalProfitId}
    FROM normalized_orders
    WHERE event_date IS NOT NULL
      AND status_value IN (${orderCountedSql})
    GROUP BY 1
  ),
  monthly_birth AS (
    SELECT
      TO_CHAR(date_trunc('month', birth_date), 'YYYY-MM') AS month_key,
      COALESCE(SUM(CASE WHEN ${idOrderMatchesSalesSql} AND status_value IN (${orderCountedSql}) THEN 1 ELSE 0 END), 0) AS ${totalOrdersId}
    FROM normalized_orders
    WHERE birth_date IS NOT NULL
    GROUP BY 1
  ),
  monthly_cancellations AS (
    SELECT
      TO_CHAR(date_trunc('month', canceled_at), 'YYYY-MM') AS month_key,
      COUNT(*) AS ${canceledId},
      COALESCE(SUM(refund_value), 0) AS ${totalRefundId}
    FROM normalized_orders
    WHERE canceled_at IS NOT NULL
      AND status_value IN (${refundCountedSql})
    GROUP BY 1
  ),
  all_months AS (
    SELECT month_key FROM monthly_event
    UNION
    SELECT month_key FROM monthly_birth
    UNION
    SELECT month_key FROM monthly_cancellations
  )
  SELECT
    all_months.month_key AS ${monthKeyId},
    COALESCE(mb.${totalOrdersId}, 0) AS ${totalOrdersId},
    COALESCE(mc.${canceledId}, 0) AS ${canceledId},
    COALESCE(me.${totalRevId}, 0) AS ${totalRevId},
    COALESCE(me.${totalProfitId}, 0) AS ${totalProfitId},
    COALESCE(mc.${totalRefundId}, 0) AS ${totalRefundId}
  FROM all_months
  LEFT JOIN monthly_event me ON me.month_key = all_months.month_key
  LEFT JOIN monthly_birth mb ON mb.month_key = all_months.month_key
  LEFT JOIN monthly_cancellations mc ON mc.month_key = all_months.month_key
  ORDER BY all_months.month_key ASC
`;
};

module.exports = { buildDashboardSummaryAggregateQuery };
