/**
 * Gộp doanh thu / lợi nhuận / hoàn từ order_list theo thời điểm phát sinh (không gom theo thuần tháng order_date).
 * - Mốc «sinh bản ghi / đơn» (đếm đơn, gross): birth_date = COALESCE(created_at, order_date).
 * - Doanh thu & lợi nhuận ghi theo event_date: Chưa/Đã hoàn → tháng canceled_at; còn lại → tháng birth_date.
 * - Hoàn tiền: tháng canceled_at.
 * @see scripts/ops/rebuild-dashboard-monthly-summary.js (cùng công thức)
 */
const {
  ORDERS_SCHEMA,
  SCHEMA_ORDERS,
  tableName,
} = require("../../config/dbSchema");
const { STATUS } = require("../../utils/statuses");
const { ORDER_PREFIXES } = require("../../utils/orderHelpers");
const {
  createDateNormalization,
  createNumericExtraction,
  quoteIdent,
} = require("../../utils/sql");

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

/**
 * Biểu đồ: đếm đơn theo birth; doanh thu / lợi nhuận theo event; hoàn theo cancel.
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

/**
 * SUM(giá bán) MAV* theo mốc birth (created_at, fallback order_date) trong khoảng [from, to] (inclusive).
 * Dùng KPI: Doanh thu thuần = gross − tổng hoàn cùng kỳ.
 * @param {{ useCreatedAt?: boolean }} [options]
 */
const buildGrossSalesByBirthDateRangeQuery = (options = {}) => {
  const useCreatedAt = Boolean(options.useCreatedAt);
  const birthDateExpr = makeBirthDateExpr(useCreatedAt);
  return `
  WITH no AS (
    SELECT
      ${orderDateExpr} AS order_date,
      ${priceExpr} AS price_value,
      TRIM(COALESCE(${o}.${quoteIdent(orderCols.STATUS)}::text, '')) AS status_value,
      UPPER(TRIM(COALESCE(${o}.${quoteIdent(orderCols.ID_ORDER)}::text, ''))) AS id_order_upper,
      ${birthDateExpr} AS birth_date
    FROM ${orderTable} ${o}
  )
  SELECT COALESCE(SUM(
    CASE
      WHEN ( ${idOrderMatchesSalesSql} ) AND no.status_value IN (${orderCountedSql})
        AND no.birth_date IS NOT NULL
        AND no.birth_date::date >= ?::date
        AND no.birth_date::date <= ?::date
      THEN no.price_value
      ELSE 0
    END
  ), 0) AS gross_sales
  FROM no
`;
};

module.exports = {
  buildDashboardSummaryAggregateQuery,
  buildRangeCompareStatsQuery,
  buildRangeMonthlyChartQuery,
  buildRangeDailyChartQuery,
  buildGrossSalesByBirthDateRangeQuery,
  revenueCountedStatuses,
  orderCountedStatuses,
};
