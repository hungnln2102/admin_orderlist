const {
  o,
  orderTable,
  orderCols,
  quoteIdent,
  orderCountedSql,
  makeBirthDateExpr,
} = require("@/controllers/DashboardController/summaryQueries/constants");

/** Đếm đơn theo mốc birth trong [from, to] (cùng tập status «đang trong sổ bán»). */
const buildOrderCountBirthInRangeQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  if (useCreatedAt) {
    return `
    SELECT COUNT(*)::bigint AS c
    FROM ${orderTable} ${o}
    WHERE TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) IN (${orderCountedSql})
      AND (
        (${o}.${quoteIdent(orderCols.CREATED_AT)} IS NOT NULL AND ${o}.${quoteIdent(orderCols.CREATED_AT)} >= :fromTs::timestamptz AND ${o}.${quoteIdent(orderCols.CREATED_AT)} <= :toTs::timestamptz)
        OR
        (${o}.${quoteIdent(orderCols.CREATED_AT)} IS NULL AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} >= :from::date AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} <= :to::date)
      )
    `;
  }
  return `
  SELECT COUNT(*)::bigint AS c
  FROM ${orderTable} ${o}
  WHERE TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) IN (${orderCountedSql})
    AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} >= :from::date
    AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} <= :to::date
  `;
};

/** Gom số đơn (mốc birth) theo tháng lịch YYYY-MM trong [from, to]. */
const buildOrderCountsByBirthYmInRangeQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  if (useCreatedAt) {
    return `
    SELECT
      to_char(COALESCE(${o}.${quoteIdent(orderCols.CREATED_AT)} AT TIME ZONE 'Asia/Ho_Chi_Minh', ${o}.${quoteIdent(orderCols.ORDER_DATE)})::date, 'YYYY-MM') AS mk,
      COUNT(*)::bigint AS c
    FROM ${orderTable} ${o}
    WHERE TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) IN (${orderCountedSql})
      AND (
        (${o}.${quoteIdent(orderCols.CREATED_AT)} IS NOT NULL AND ${o}.${quoteIdent(orderCols.CREATED_AT)} >= :fromTs::timestamptz AND ${o}.${quoteIdent(orderCols.CREATED_AT)} <= :toTs::timestamptz)
        OR
        (${o}.${quoteIdent(orderCols.CREATED_AT)} IS NULL AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} >= :from::date AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} <= :to::date)
      )
    GROUP BY 1
    ORDER BY 1
    `;
  }
  return `
  SELECT
    to_char(${o}.${quoteIdent(orderCols.ORDER_DATE)}::date, 'YYYY-MM') AS mk,
    COUNT(*)::bigint AS c
  FROM ${orderTable} ${o}
  WHERE TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) IN (${orderCountedSql})
    AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} >= :from::date
    AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} <= :to::date
  GROUP BY 1
  ORDER BY 1
  `;
};

/** Gom số đơn (mốc birth) theo năm lịch YYYY trong [from, to]. */
const buildOrderCountsByBirthYearInRangeQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  if (useCreatedAt) {
    return `
    SELECT
      to_char(COALESCE(${o}.${quoteIdent(orderCols.CREATED_AT)} AT TIME ZONE 'Asia/Ho_Chi_Minh', ${o}.${quoteIdent(orderCols.ORDER_DATE)})::date, 'YYYY') AS yk,
      COUNT(*)::bigint AS c
    FROM ${orderTable} ${o}
    WHERE TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) IN (${orderCountedSql})
      AND (
        (${o}.${quoteIdent(orderCols.CREATED_AT)} IS NOT NULL AND ${o}.${quoteIdent(orderCols.CREATED_AT)} >= :fromTs::timestamptz AND ${o}.${quoteIdent(orderCols.CREATED_AT)} <= :toTs::timestamptz)
        OR
        (${o}.${quoteIdent(orderCols.CREATED_AT)} IS NULL AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} >= :from::date AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} <= :to::date)
      )
    GROUP BY 1
    ORDER BY 1
    `;
  }
  return `
  SELECT
    to_char(${o}.${quoteIdent(orderCols.ORDER_DATE)}::date, 'YYYY') AS yk,
    COUNT(*)::bigint AS c
  FROM ${orderTable} ${o}
  WHERE TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) IN (${orderCountedSql})
    AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} >= :from::date
    AND ${o}.${quoteIdent(orderCols.ORDER_DATE)} <= :to::date
  GROUP BY 1
  ORDER BY 1
  `;
};

module.exports = {
  buildOrderCountBirthInRangeQuery,
  buildOrderCountsByBirthYmInRangeQuery,
  buildOrderCountsByBirthYearInRangeQuery,
};
