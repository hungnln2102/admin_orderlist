/**
 * Constants + SQL expression fragments dùng chung cho mọi query builder của
 * dashboard summary. Tách riêng để không lặp giữa các builder; mọi thay đổi về
 * công thức `birth_date` / `event_date` / `revenue` / `profit` chỉ phải sửa tại đây.
 */
const {
  ORDERS_SCHEMA,
  SCHEMA_ORDERS,
  tableName,
} = require("../../../config/dbSchema");
const { STATUS } = require("../../../utils/statuses");
const { ORDER_PREFIXES } = require("../../../utils/orderHelpers");
const {
  createDateNormalization,
  createNumericExtraction,
  quoteIdent,
} = require("../../../utils/sql");

const salesPrefixEscList = [
  ORDER_PREFIXES.ctv,
  ORDER_PREFIXES.customer,
  ORDER_PREFIXES.promo,
  ORDER_PREFIXES.student,
].map((p) => String(p || "").toUpperCase().replace(/'/g, "''"));

const idOrderMatchesSalesSql = `(${salesPrefixEscList
  .map((p) => `id_order_upper LIKE '${p}%'`)
  .join(" OR ")})`;

const orderTable = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const orderCols = ORDERS_SCHEMA.ORDER_LIST.COLS;

const o = "o";
const orderDateExpr = createDateNormalization(`${o}.${quoteIdent(orderCols.ORDER_DATE)}`);
const canceledAtExpr = createDateNormalization(`${o}.${quoteIdent(orderCols.CANCELED_AT)}`);
const priceExpr = createNumericExtraction(`${o}.${quoteIdent(orderCols.PRICE)}`);
const costExpr = createNumericExtraction(`${o}.${quoteIdent(orderCols.COST)}`);
const refundExpr = createNumericExtraction(`${o}.${quoteIdent(orderCols.REFUND)}`);

/** Vẫn «đang trong sổ bán» (đếm đơn) — gồm cả Chưa/Đã hoàn. */
const orderCountedStatuses = [
  STATUS.PROCESSING,
  STATUS.PAID,
  STATUS.PENDING_REFUND,
  STATUS.REFUNDED,
  STATUS.RENEWAL,
  STATUS.EXPIRED,
];

/** Chưa/đang hoàn: tính doanh thu theo prorata (trừ phần refund). */
const revenueCountedStatuses = [
  STATUS.PROCESSING,
  STATUS.PAID,
  STATUS.RENEWAL,
  STATUS.EXPIRED,
];

const refundCountedStatuses = [STATUS.PENDING_REFUND, STATUS.REFUNDED];

const toSqlLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

const orderCountedSql = orderCountedStatuses.map(toSqlLiteral).join(", ");
const revenueCountedSql = revenueCountedStatuses.map(toSqlLiteral).join(", ");
const refundCountedSql = refundCountedStatuses.map(toSqlLiteral).join(", ");

const idOrderMatchNo = idOrderMatchesSalesSql.replace(
  /id_order_upper/g,
  "no.id_order_upper"
);

/** Mốc birth: có cột created_at (sau migration 083) thì COALESCE(created_at, order_date); không thì chỉ order_date. */
const makeBirthDateExpr = (useCreatedAt) =>
  useCreatedAt
    ? `
  COALESCE(
    NULLIF((${o}.${quoteIdent(orderCols.CREATED_AT)})::date, NULL),
    ${orderDateExpr}
  )
`
    : `(${orderDateExpr})`;

/** Tháng ghi doanh thu / lợi nhuận: hoàn → canceled_at; còn lại → birth. */
const makeEventDateExpr = (birthDateExprFragment) => `
  CASE
    WHEN TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) IN (${refundCountedSql})
      AND ${canceledAtExpr} IS NOT NULL
    THEN ${canceledAtExpr}
    ELSE ${birthDateExprFragment}
  END
`;

/** Cùng công thức một dòng: refund (còn lại) vs chưa hoàn (toàn bộ). */
const revenueByEventValueExpr = `
  CASE
    WHEN ${idOrderMatchesSalesSql} AND status_value IN (${refundCountedSql})
    THEN GREATEST(0, price_value - COALESCE(refund_value, 0))
    WHEN ${idOrderMatchesSalesSql} AND status_value IN (${revenueCountedSql})
    THEN price_value
    ELSE 0
  END
`;

const profitByEventValueExpr = `
  CASE
    WHEN ${idOrderMatchesSalesSql} AND status_value IN (${refundCountedSql}) AND price_value > 0
    THEN
      (price_value - cost_value) * GREATEST(0, price_value - COALESCE(refund_value, 0)) / price_value
    WHEN ${idOrderMatchesSalesSql} AND status_value IN (${revenueCountedSql})
    THEN price_value - cost_value
    ELSE 0
  END
`;

const revenueByEventValueExprNo = `
  CASE
    WHEN ${idOrderMatchNo} AND no.status_value IN (${refundCountedSql})
    THEN GREATEST(0, no.price_value - COALESCE(no.refund_value, 0))
    WHEN ${idOrderMatchNo} AND no.status_value IN (${revenueCountedSql})
    THEN no.price_value
    ELSE 0
  END
`;

const profitByEventValueExprNo = `
  CASE
    WHEN ${idOrderMatchNo} AND no.status_value IN (${refundCountedSql}) AND no.price_value > 0
    THEN
      (no.price_value - no.cost_value) * GREATEST(0, no.price_value - COALESCE(no.refund_value, 0)) / no.price_value
    WHEN ${idOrderMatchNo} AND no.status_value IN (${revenueCountedSql})
    THEN no.price_value - no.cost_value
    ELSE 0
  END
`;

module.exports = {
  o,
  orderTable,
  orderCols,
  quoteIdent,
  orderDateExpr,
  canceledAtExpr,
  priceExpr,
  costExpr,
  refundExpr,
  orderCountedStatuses,
  revenueCountedStatuses,
  refundCountedStatuses,
  orderCountedSql,
  revenueCountedSql,
  refundCountedSql,
  idOrderMatchesSalesSql,
  idOrderMatchNo,
  makeBirthDateExpr,
  makeEventDateExpr,
  revenueByEventValueExpr,
  profitByEventValueExpr,
  revenueByEventValueExprNo,
  profitByEventValueExprNo,
};
