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
} = require("@/controllers/DashboardController/summaryQueries/constants");

/**
 * So sánh 2 khoảng: đếm đơn theo birth_date; doanh thu & lợi nhuận theo event_date; hoàn theo canceled_at.
 * @param {{ useCreatedAt?: boolean }} [options]
 */
const buildRangeCompareStatsQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  const birthDateExpr = useCreatedAt
    ? `COALESCE(${o}.${quoteIdent(orderCols.ORDER_DATE)}, (${o}.${quoteIdent(orderCols.CREATED_AT)} AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)`
    : `${orderDateExpr}`;
  return `
  WITH params AS (
    SELECT ?::date AS c0, ?::date AS c1, ?::date AS p0, ?::date AS p1
  ),
  no AS (
    SELECT
      ${orderDateExpr} AS order_date,
      ${canceledAtExpr} AS canceled_at,
      ${priceExpr} AS price_value,
      ${costExpr} AS cost_value,
      ${refundExpr} AS refund_value,
      TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) AS status_value,
      UPPER(TRIM(COALESCE(${o}.${quoteIdent(orderCols.ID_ORDER)}::text, ''))) AS id_order_upper,
      ${birthDateExpr} AS birth_date
    FROM ${orderTable} ${o}
    CROSS JOIN params p
    WHERE
      (${o}.${quoteIdent(orderCols.ORDER_DATE)} >= LEAST(p.c0, p.p0) - INTERVAL '2 days' AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} <= GREATEST(p.c1, p.p1) + INTERVAL '2 days')
      OR (${o}.${quoteIdent(orderCols.CREATED_AT)} >= LEAST(p.c0, p.p0) - INTERVAL '2 days' AND ${o}.${quoteIdent(orderCols.CREATED_AT)} <= GREATEST(p.c1, p.p1) + INTERVAL '2 days')
      OR (${o}.${quoteIdent(orderCols.CANCELED_AT)} >= LEAST(p.c0, p.p0) - INTERVAL '2 days' AND ${o}.${quoteIdent(orderCols.CANCELED_AT)} <= GREATEST(p.c1, p.p1) + INTERVAL '2 days')
  )
  SELECT
    COALESCE(SUM(CASE
      WHEN no.birth_date IS NOT NULL
        AND no.birth_date >= p.c0 AND no.birth_date <= p.c1
        AND no.status_value NOT IN ('CANCELED', 'Đã Hủy')
      THEN 1
      ELSE 0
    END), 0)::bigint AS total_orders_curr,
    COALESCE(SUM(CASE
      WHEN no.birth_date IS NOT NULL
        AND no.birth_date >= p.p0 AND no.birth_date <= p.p1
        AND no.status_value NOT IN ('CANCELED', 'Đã Hủy')
      THEN 1
      ELSE 0
    END), 0)::bigint AS total_orders_prev,

    COALESCE(SUM(CASE
      WHEN no.birth_date IS NOT NULL
        AND no.birth_date >= p.c0 AND no.birth_date <= p.c1
        AND (${idOrderMatchNo})
        AND no.status_value NOT IN ('CANCELED', 'Đã Hủy')
      THEN CASE
        WHEN no.status_value IN (${refundCountedSql})
        THEN GREATEST(0, no.price_value - COALESCE(no.refund_value, 0))
        ELSE no.price_value
      END
      ELSE 0
    END), 0) AS net_revenue_curr,
    COALESCE(SUM(CASE
      WHEN no.birth_date IS NOT NULL
        AND no.birth_date >= p.p0 AND no.birth_date <= p.p1
        AND (${idOrderMatchNo})
        AND no.status_value NOT IN ('CANCELED', 'Đã Hủy')
      THEN CASE
        WHEN no.status_value IN (${refundCountedSql})
        THEN GREATEST(0, no.price_value - COALESCE(no.refund_value, 0))
        ELSE no.price_value
      END
      ELSE 0
    END), 0) AS net_revenue_prev,

    COALESCE(SUM(CASE
      WHEN no.birth_date IS NOT NULL
        AND no.birth_date >= p.c0 AND no.birth_date <= p.c1
        AND no.status_value NOT IN ('CANCELED', 'Đã Hủy')
      THEN CASE
        WHEN (${idOrderMatchNo}) THEN no.cost_value
        ELSE COALESCE(NULLIF(no.cost_value, 0), no.price_value)
      END
      ELSE 0
    END), 0) AS total_cost_curr,
    COALESCE(SUM(CASE
      WHEN no.birth_date IS NOT NULL
        AND no.birth_date >= p.p0 AND no.birth_date <= p.p1
        AND no.status_value NOT IN ('CANCELED', 'Đã Hủy')
      THEN CASE
        WHEN (${idOrderMatchNo}) THEN no.cost_value
        ELSE COALESCE(NULLIF(no.cost_value, 0), no.price_value)
      END
      ELSE 0
    END), 0) AS total_cost_prev,

    COALESCE(SUM(CASE
      WHEN no.canceled_at IS NOT NULL
        AND no.canceled_at::date >= p.c0 AND no.canceled_at::date <= p.c1
        AND no.status_value IN (${refundCountedSql})
      THEN no.refund_value
      ELSE 0
    END), 0) AS total_refund_curr,
    COALESCE(SUM(CASE
      WHEN no.canceled_at IS NOT NULL
        AND no.canceled_at::date >= p.p0 AND no.canceled_at::date <= p.p1
        AND no.status_value IN (${refundCountedSql})
      THEN no.refund_value
      ELSE 0
    END), 0) AS total_refund_prev
  FROM no
  CROSS JOIN params p
`;
};

module.exports = { buildRangeCompareStatsQuery };
