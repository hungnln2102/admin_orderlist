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
  const birthDateExpr = makeBirthDateExpr(useCreatedAt);
  return `
  WITH no AS (
    SELECT
      TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) AS status_value,
      ${birthDateExpr} AS birth_date
    FROM ${orderTable} ${o}
  )
  SELECT COUNT(*)::bigint AS c
  FROM no
  WHERE no.birth_date IS NOT NULL
    AND no.birth_date::date >= ?::date
    AND no.birth_date::date <= ?::date
    AND no.status_value IN (${orderCountedSql})
  `;
};

/** Gom số đơn (mốc birth) theo tháng lịch YYYY-MM trong [from, to]. */
const buildOrderCountsByBirthYmInRangeQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  const birthDateExpr = makeBirthDateExpr(useCreatedAt);
  return `
  WITH no AS (
    SELECT
      TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) AS status_value,
      ${birthDateExpr} AS birth_date
    FROM ${orderTable} ${o}
  )
  SELECT
    to_char(no.birth_date::date, 'YYYY-MM') AS mk,
    COUNT(*)::bigint AS c
  FROM no
  WHERE no.birth_date IS NOT NULL
    AND no.birth_date::date >= ?::date
    AND no.birth_date::date <= ?::date
    AND no.status_value IN (${orderCountedSql})
  GROUP BY 1
  ORDER BY 1
  `;
};

/** Gom số đơn (mốc birth) theo năm lịch YYYY trong [from, to]. */
const buildOrderCountsByBirthYearInRangeQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  const birthDateExpr = makeBirthDateExpr(useCreatedAt);
  return `
  WITH no AS (
    SELECT
      TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) AS status_value,
      ${birthDateExpr} AS birth_date
    FROM ${orderTable} ${o}
  )
  SELECT
    to_char(no.birth_date::date, 'YYYY') AS yk,
    COUNT(*)::bigint AS c
  FROM no
  WHERE no.birth_date IS NOT NULL
    AND no.birth_date::date >= ?::date
    AND no.birth_date::date <= ?::date
    AND no.status_value IN (${orderCountedSql})
  GROUP BY 1
  ORDER BY 1
  `;
};

module.exports = {
  buildOrderCountBirthInRangeQuery,
  buildOrderCountsByBirthYmInRangeQuery,
  buildOrderCountsByBirthYearInRangeQuery,
};
