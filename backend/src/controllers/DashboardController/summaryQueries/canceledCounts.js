const {
  o,
  orderTable,
  orderCols,
  quoteIdent,
  canceledAtExpr,
  refundCountedSql,
} = require("./constants");

/** Gom số đơn hủy theo tháng canceled_at YYYY-MM trong [from, to]. */
const buildCanceledCountsByCanceledYmInRangeQuery = () => {
  return `
  WITH no AS (
    SELECT
      TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) AS status_value,
      ${canceledAtExpr} AS canceled_at
    FROM ${orderTable} ${o}
  )
  SELECT
    to_char(no.canceled_at::date, 'YYYY-MM') AS mk,
    COUNT(*)::bigint AS c
  FROM no
  WHERE no.canceled_at IS NOT NULL
    AND no.canceled_at::date >= ?::date
    AND no.canceled_at::date <= ?::date
    AND no.status_value IN (${refundCountedSql})
  GROUP BY 1
  ORDER BY 1
  `;
};

/** Gom số đơn hủy theo năm canceled_at YYYY trong [from, to]. */
const buildCanceledCountsByCanceledYearInRangeQuery = () => {
  return `
  WITH no AS (
    SELECT
      TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) AS status_value,
      ${canceledAtExpr} AS canceled_at
    FROM ${orderTable} ${o}
  )
  SELECT
    to_char(no.canceled_at::date, 'YYYY') AS yk,
    COUNT(*)::bigint AS c
  FROM no
  WHERE no.canceled_at IS NOT NULL
    AND no.canceled_at::date >= ?::date
    AND no.canceled_at::date <= ?::date
    AND no.status_value IN (${refundCountedSql})
  GROUP BY 1
  ORDER BY 1
  `;
};

module.exports = {
  buildCanceledCountsByCanceledYmInRangeQuery,
  buildCanceledCountsByCanceledYearInRangeQuery,
};
