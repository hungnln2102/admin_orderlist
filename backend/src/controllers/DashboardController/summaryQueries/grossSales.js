const {
  o,
  orderTable,
  orderCols,
  quoteIdent,
  orderDateExpr,
  priceExpr,
  orderCountedSql,
  idOrderMatchesSalesSql,
  makeBirthDateExpr,
} = require("@/controllers/DashboardController/summaryQueries/constants");

/**
 * SUM(giá bán) MAV* theo mốc birth (created_at, fallback order_date) trong khoảng [from, to] (inclusive).
 * Dùng KPI: Doanh thu thuần = gross − tổng hoàn cùng kỳ.
 * @param {{ useCreatedAt?: boolean }} [options]
 */
const buildGrossSalesByBirthDateRangeQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  const birthDateExpr = makeBirthDateExpr(useCreatedAt);
  return `
  WITH params AS ( SELECT ?::date AS c0, ?::date AS c1 ),
  no AS (
    SELECT
      ${orderDateExpr} AS order_date,
      ${priceExpr} AS price_value,
      TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) AS status_value,
      UPPER(TRIM(COALESCE(${o}.${quoteIdent(orderCols.ID_ORDER)}::text, ''))) AS id_order_upper,
      ${birthDateExpr} AS birth_date
    FROM ${orderTable} ${o}
    CROSS JOIN params p
    WHERE
      (${o}.${quoteIdent(orderCols.ORDER_DATE)} >= p.c0 - INTERVAL '2 days' AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} <= p.c1 + INTERVAL '2 days')
      OR (${o}.${quoteIdent(orderCols.CREATED_AT)} >= p.c0 - INTERVAL '2 days' AND ${o}.${quoteIdent(orderCols.CREATED_AT)} <= p.c1 + INTERVAL '2 days')
  )
  SELECT COALESCE(SUM(
    CASE
      WHEN ( ${idOrderMatchesSalesSql} ) AND no.status_value IN (${orderCountedSql})
        AND no.birth_date IS NOT NULL
        AND no.birth_date::date >= p.c0
        AND no.birth_date::date <= p.c1
      THEN no.price_value
      ELSE 0
    END
  ), 0) AS gross_sales
  FROM no
  CROSS JOIN params p
`;
};

module.exports = { buildGrossSalesByBirthDateRangeQuery };
