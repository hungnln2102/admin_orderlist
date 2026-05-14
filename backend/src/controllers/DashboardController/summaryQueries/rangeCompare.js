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
 * So sánh 2 khoảng: đếm đơn theo birth_date; doanh thu & lợi nhuận theo event_date; hoàn theo canceled_at.
 * @param {{ useCreatedAt?: boolean }} [options]
 */
const buildRangeCompareStatsQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  const birthDateExpr = makeBirthDateExpr(useCreatedAt);
  const eventDateExpr = makeEventDateExpr(birthDateExpr);
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
      ${birthDateExpr} AS birth_date,
      ${eventDateExpr} AS event_date
    FROM ${orderTable} ${o}
  )
  SELECT
    COALESCE(SUM(CASE
      WHEN no.birth_date IS NOT NULL
        AND no.birth_date::date >= p.c0::date AND no.birth_date::date <= p.c1::date
        AND ( ${idOrderMatchNo} ) AND no.status_value IN (${orderCountedSql})
      THEN 1
      ELSE 0
    END), 0)::bigint AS total_orders_curr,
    COALESCE(SUM(CASE
      WHEN no.birth_date IS NOT NULL
        AND no.birth_date::date >= p.p0::date AND no.birth_date::date <= p.p1::date
        AND ( ${idOrderMatchNo} ) AND no.status_value IN (${orderCountedSql})
      THEN 1
      ELSE 0
    END), 0)::bigint AS total_orders_prev,
    COALESCE(SUM(CASE
      WHEN no.canceled_at::date >= p.c0::date AND no.canceled_at::date <= p.c1::date
        AND no.status_value IN (${refundCountedSql})
      THEN 1
      ELSE 0
    END), 0)::bigint AS total_canceled_curr,
    COALESCE(SUM(CASE
      WHEN no.canceled_at::date >= p.p0::date AND no.canceled_at::date <= p.p1::date
        AND no.status_value IN (${refundCountedSql})
      THEN 1
      ELSE 0
    END), 0)::bigint AS total_canceled_prev,
    COALESCE(SUM(CASE
      WHEN no.event_date IS NOT NULL
        AND no.event_date::date >= p.c0::date AND no.event_date::date <= p.c1::date
        AND no.status_value IN (${orderCountedSql})
      THEN ${revenueByEventValueExprNo}
      ELSE 0
    END), 0) AS net_revenue_curr,
    COALESCE(SUM(CASE
      WHEN no.event_date IS NOT NULL
        AND no.event_date::date >= p.p0::date AND no.event_date::date <= p.p1::date
        AND no.status_value IN (${orderCountedSql})
      THEN ${revenueByEventValueExprNo}
      ELSE 0
    END), 0) AS net_revenue_prev,
    0::numeric AS total_cost_curr,
    0::numeric AS total_cost_prev,
    COALESCE(SUM(CASE
      WHEN no.event_date IS NOT NULL
        AND no.event_date::date >= p.c0::date AND no.event_date::date <= p.c1::date
        AND no.status_value IN (${orderCountedSql})
      THEN ${profitByEventValueExprNo}
      ELSE 0
    END), 0) AS net_profit_curr,
    COALESCE(SUM(CASE
      WHEN no.event_date IS NOT NULL
        AND no.event_date::date >= p.p0::date AND no.event_date::date <= p.p1::date
        AND no.status_value IN (${orderCountedSql})
      THEN ${profitByEventValueExprNo}
      ELSE 0
    END), 0) AS net_profit_prev,
    COALESCE(SUM(CASE
      WHEN no.canceled_at IS NOT NULL
        AND no.canceled_at::date >= p.c0::date AND no.canceled_at::date <= p.c1::date
        AND no.status_value IN (${refundCountedSql})
      THEN no.refund_value
      ELSE 0
    END), 0) AS total_refund_curr,
    COALESCE(SUM(CASE
      WHEN no.canceled_at IS NOT NULL
        AND no.canceled_at::date >= p.p0::date AND no.canceled_at::date <= p.p1::date
        AND no.status_value IN (${refundCountedSql})
      THEN no.refund_value
      ELSE 0
    END), 0) AS total_refund_prev
  FROM no
  CROSS JOIN params p
`;
};

module.exports = { buildRangeCompareStatsQuery };
