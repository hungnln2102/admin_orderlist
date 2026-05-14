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
  idOrderMatchNo,
  makeBirthDateExpr,
  makeEventDateExpr,
  revenueByEventValueExprNo,
  profitByEventValueExprNo,
} = require("./constants");

/**
 * Biểu đồ tháng: đếm đơn theo birth; doanh thu / lợi nhuận theo event; hoàn theo cancel.
 * @param {{ useCreatedAt?: boolean }} [options]
 */
const buildRangeMonthlyChartQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  const birthDateExpr = makeBirthDateExpr(useCreatedAt);
  const eventDateExpr = makeEventDateExpr(birthDateExpr);
  return `
  WITH params AS ( SELECT ?::date AS c0, ?::date AS c1 ),
  no AS (
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
      date_trunc('month', no.event_date)::date AS month_start,
      COALESCE(SUM(${revenueByEventValueExprNo}), 0) AS net_revenue,
      COALESCE(SUM(${profitByEventValueExprNo}), 0) AS net_profit
    FROM no
    CROSS JOIN params p
    WHERE no.event_date IS NOT NULL
      AND no.event_date::date >= p.c0::date
      AND no.event_date::date <= p.c1::date
      AND no.status_value IN (${orderCountedSql})
    GROUP BY 1
  ),
  monthly_birth AS (
    SELECT
      date_trunc('month', no.birth_date)::date AS month_start,
      COALESCE(SUM(CASE
        WHEN ( ${idOrderMatchNo} ) AND no.status_value IN (${orderCountedSql})
        THEN 1
        ELSE 0
      END), 0)::bigint AS total_orders
    FROM no
    CROSS JOIN params p
    WHERE no.birth_date IS NOT NULL
      AND no.birth_date::date >= p.c0::date
      AND no.birth_date::date <= p.c1::date
    GROUP BY 1
  ),
  monthly_rev AS (
    SELECT
      COALESCE(e.month_start, b.month_start) AS month_start,
      COALESCE(b.total_orders, 0)::bigint AS total_orders,
      COALESCE(e.net_revenue, 0) AS net_revenue,
      COALESCE(e.net_profit, 0) AS net_profit
    FROM monthly_event e
    FULL OUTER JOIN monthly_birth b ON e.month_start = b.month_start
  ),
  monthly_ref AS (
    SELECT
      date_trunc('month', no.canceled_at)::date AS month_start,
      COUNT(*)::bigint AS total_canceled,
      COALESCE(SUM(no.refund_value), 0) AS total_refund
    FROM no
    CROSS JOIN params p
    WHERE no.canceled_at IS NOT NULL
      AND no.canceled_at::date >= p.c0::date
      AND no.canceled_at::date <= p.c1::date
      AND no.status_value IN (${refundCountedSql})
    GROUP BY 1
  ),
  month_bucket AS (
    SELECT gs::date AS month_start
    FROM params,
    generate_series(
      date_trunc('month', (SELECT c0 FROM params))::date,
      date_trunc('month', (SELECT c1 FROM params))::date,
      '1 month'::interval
    ) AS gs
  )
  SELECT
    EXTRACT(MONTH FROM mb.month_start)::int AS month_num,
    EXTRACT(YEAR FROM mb.month_start)::int AS year_num,
    COALESCE(mr.total_orders, 0)::bigint AS total_orders,
    COALESCE(mref.total_canceled, 0)::bigint AS total_canceled,
    COALESCE(mr.net_revenue, 0) AS total_revenue,
    COALESCE(mr.net_profit, 0) AS total_profit,
    COALESCE(mref.total_refund, 0) AS total_refund
  FROM month_bucket mb
  LEFT JOIN monthly_rev mr ON mr.month_start = mb.month_start
  LEFT JOIN monthly_ref mref ON mref.month_start = mb.month_start
  ORDER BY mb.month_start
`;
};

/**
 * Giống {@link buildRangeMonthlyChartQuery} nhưng bucket **theo ngày** (mỗi ngày trong [c0,c1]).
 * Dùng khi khoảng lọc ngắn để biểu đồ khớp preset Ngày / Tháng / khoảng tùy chỉnh.
 * @param {{ useCreatedAt?: boolean }} [options]
 */
const buildRangeDailyChartQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  const birthDateExpr = makeBirthDateExpr(useCreatedAt);
  const eventDateExpr = makeEventDateExpr(birthDateExpr);
  return `
  WITH params AS ( SELECT ?::date AS c0, ?::date AS c1 ),
  no AS (
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
  daily_event AS (
    SELECT
      no.event_date::date AS d,
      COALESCE(SUM(${revenueByEventValueExprNo}), 0) AS net_revenue,
      COALESCE(SUM(${profitByEventValueExprNo}), 0) AS net_profit
    FROM no
    CROSS JOIN params p
    WHERE no.event_date IS NOT NULL
      AND no.event_date::date >= p.c0::date
      AND no.event_date::date <= p.c1::date
      AND no.status_value IN (${orderCountedSql})
    GROUP BY 1
  ),
  daily_birth AS (
    SELECT
      no.birth_date::date AS d,
      COALESCE(SUM(CASE
        WHEN ( ${idOrderMatchNo} ) AND no.status_value IN (${orderCountedSql})
        THEN 1
        ELSE 0
      END), 0)::bigint AS total_orders
    FROM no
    CROSS JOIN params p
    WHERE no.birth_date IS NOT NULL
      AND no.birth_date::date >= p.c0::date
      AND no.birth_date::date <= p.c1::date
    GROUP BY 1
  ),
  daily_rev AS (
    SELECT
      COALESCE(e.d, b.d) AS d,
      COALESCE(b.total_orders, 0)::bigint AS total_orders,
      COALESCE(e.net_revenue, 0) AS net_revenue,
      COALESCE(e.net_profit, 0) AS net_profit
    FROM daily_event e
    FULL OUTER JOIN daily_birth b ON e.d = b.d
  ),
  daily_ref AS (
    SELECT
      no.canceled_at::date AS d,
      COUNT(*)::bigint AS total_canceled,
      COALESCE(SUM(no.refund_value), 0) AS total_refund
    FROM no
    CROSS JOIN params p
    WHERE no.canceled_at IS NOT NULL
      AND no.canceled_at::date >= p.c0::date
      AND no.canceled_at::date <= p.c1::date
      AND no.status_value IN (${refundCountedSql})
    GROUP BY 1
  ),
  day_bucket AS (
    SELECT gs::date AS d
    FROM params,
    generate_series((SELECT c0 FROM params), (SELECT c1 FROM params), interval '1 day') AS gs
  )
  SELECT
    db.d::text AS day_iso,
    COALESCE(rv.total_orders, 0)::bigint AS total_orders,
    COALESCE(rf.total_canceled, 0)::bigint AS total_canceled,
    COALESCE(rv.net_revenue, 0) AS total_revenue,
    COALESCE(rv.net_profit, 0) AS total_profit,
    COALESCE(rf.total_refund, 0) AS total_refund
  FROM day_bucket db
  LEFT JOIN daily_rev rv ON rv.d = db.d
  LEFT JOIN daily_ref rf ON rf.d = db.d
  ORDER BY db.d
`;
};

module.exports = {
  buildRangeMonthlyChartQuery,
  buildRangeDailyChartQuery,
};
