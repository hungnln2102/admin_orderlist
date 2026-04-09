const {
  createDateNormalization,
  createNumericExtraction,
  quoteIdent,
} = require("../../utils/sql");
const { ORDERS_SCHEMA } = require("../../config/dbSchema");
const { STATUS } = require("../../utils/statuses");
const {
  ORDER_DEF,
  TABLES,
  CURRENT_DATE_SQL,
  normalizedYearCase,
} = require("./constants");

const ORDER_COLS = ORDER_DEF.COLS;
const ORDER_LIST_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;
const STATUS_EXPIRED = STATUS.EXPIRED;
const STATUS_RENEWAL = STATUS.RENEWAL;
const STATUS_PENDING_REFUND = STATUS.PENDING_REFUND;
const STATUS_REFUNDED = STATUS.REFUNDED;

const buildStatsBindings = (periods) => ({
  prevStart: periods.previousStart,
  prevEnd: periods.previousEnd,
  currStart: periods.currentStart,
  currEnd: periods.currentEnd,
});

const buildStatsQuery = () => `
  WITH params AS (
    SELECT
      :prevStart::date AS prev_start,
      :prevEnd::date AS prev_end,
      :currStart::date AS curr_start,
      :currEnd::date AS curr_end
  ),
  valid_orders AS (
    SELECT
      ${quoteIdent(ORDER_COLS.ID)} AS order_id,
      CASE
        WHEN ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS_EXPIRED}' THEN 'expired'
        WHEN ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS_RENEWAL}' THEN 'renewal_needed'
        ELSE 'active'
      END AS status,
      ${createDateNormalization(quoteIdent(ORDER_COLS.ORDER_DATE))} AS registration_date,
      NULL::date AS expiry_date,
      ${createNumericExtraction(quoteIdent(ORDER_COLS.COST))} AS cost_value,
      ${createNumericExtraction(quoteIdent(ORDER_COLS.PRICE))} AS price_value,
      ${quoteIdent(ORDER_COLS.STATUS)} AS payment_status
    FROM ${TABLES.orderList}
    WHERE TRIM(${quoteIdent(ORDER_COLS.ORDER_DATE)}::text) <> ''
      AND ${quoteIdent(ORDER_COLS.STATUS)} NOT IN ('${STATUS_PENDING_REFUND}', '${STATUS_REFUNDED}')
  ),
  canceled_data AS (
      SELECT
        ${quoteIdent(ORDER_COLS.ID)} AS order_id,
        'canceled' as status,
        ${createDateNormalization(quoteIdent(ORDER_LIST_COLS.CANCELED_AT))} AS registration_date,
        NULL::date AS expiry_date,
        ${createNumericExtraction(quoteIdent(ORDER_COLS.COST))} AS cost_value,
        ${createNumericExtraction(quoteIdent(ORDER_COLS.PRICE))} AS price_value,
        ${quoteIdent(ORDER_COLS.STATUS)} AS payment_status
      FROM ${TABLES.orderList}
      WHERE (${quoteIdent(ORDER_COLS.STATUS)} IN ('${STATUS_PENDING_REFUND}', '${STATUS_REFUNDED}') OR ${quoteIdent(ORDER_LIST_COLS.REFUND)} IS NOT NULL)
        AND TRIM(COALESCE(${quoteIdent(ORDER_LIST_COLS.CANCELED_AT)}::text, '')) <> ''
  ),
  all_data AS (
      SELECT *, FALSE as is_canceled FROM valid_orders
      UNION ALL
      SELECT *, TRUE as is_canceled FROM canceled_data
  )
  SELECT
    COALESCE(SUM(CASE
      WHEN is_canceled IS FALSE AND registration_date BETWEEN params.curr_start AND params.curr_end THEN 1
      ELSE 0
    END), 0) AS total_orders_current,
    
    COALESCE(SUM(CASE
      WHEN is_canceled IS FALSE AND registration_date BETWEEN params.prev_start AND params.prev_end THEN 1
      ELSE 0
    END), 0) AS total_orders_previous,

    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN params.curr_start AND params.curr_end THEN cost_value
      ELSE 0
    END), 0) AS total_imports_current,
    
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN params.prev_start AND params.prev_end THEN cost_value
      ELSE 0
    END), 0) AS total_imports_previous,
    
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN params.curr_start AND params.curr_end
        AND payment_status = '${STATUS.PAID}' THEN price_value - cost_value
      ELSE 0
    END), 0) AS total_profit_current,
    
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN params.prev_start AND params.prev_end
        AND payment_status = '${STATUS.PAID}' THEN price_value - cost_value
      ELSE 0
    END), 0) AS total_profit_previous,
    
    (
      SELECT COUNT(*)
      FROM valid_orders sub
      WHERE sub.status = 'renewal_needed'
    ) AS overdue_orders_count
  FROM all_data, params;
`;

const buildYearsQuery = () => `
  WITH all_dates AS (
    SELECT order_date::text AS raw_date FROM ${TABLES.orderList}
    UNION ALL
    SELECT canceled_at::text AS raw_date FROM ${TABLES.orderList}
    WHERE canceled_at IS NOT NULL
  ),
  normalized AS (
    SELECT DISTINCT ${normalizedYearCase} AS year_value
    FROM all_dates
  )
  SELECT year_value
  FROM normalized
  WHERE year_value IS NOT NULL
  ORDER BY year_value DESC;
`;

const orderPriceColumn = quoteIdent(ORDER_COLS.PRICE);
const orderCostColumn = quoteIdent(ORDER_COLS.COST);
const orderIdStringColumn = quoteIdent(ORDER_COLS.ID_ORDER);
const orderRefundColumn = quoteIdent(ORDER_LIST_COLS.REFUND);

const buildChartsQuery = () => `
  WITH params AS (
    SELECT
      ?::int AS year_value,
      make_date(?::int, 1, 1) AS year_start,
      make_date((?::int) + 1, 1, 1) AS next_year_start,
      ?::boolean AS limit_to_today
  ),
  months AS (
    SELECT gs AS month_num, TO_CHAR(gs, '"T"FM99') AS month_label
    FROM generate_series(1, 12) AS gs
  ),
  income_stream AS (
    SELECT
      ${orderIdStringColumn},
      ${createDateNormalization(quoteIdent(ORDER_COLS.ORDER_DATE))} AS event_date,
      ${orderPriceColumn} AS amount,
      ${createNumericExtraction(orderCostColumn)} AS cost,
      0::numeric AS refund_amount,
      ${quoteIdent(ORDER_COLS.STATUS)} AS status,
      1 AS order_count
    FROM ${TABLES.orderList}
    WHERE TRIM(${quoteIdent(ORDER_COLS.ORDER_DATE)}::text) <> ''
      AND ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS.PAID}'
  ),
  refund_stream AS (
    SELECT
      ${orderIdStringColumn} AS id_order,
      ${createDateNormalization(quoteIdent(ORDER_LIST_COLS.CANCELED_AT))} AS event_date,
      CASE
        WHEN ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS.REFUNDED}' THEN (${orderPriceColumn} * -1)
        ELSE 0
      END AS amount,
      CASE
        WHEN ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS.REFUNDED}' THEN (${createNumericExtraction(orderCostColumn)} * -1)
        ELSE 0
      END AS cost,
      ${createNumericExtraction(orderRefundColumn)} AS refund_amount,
      ${quoteIdent(ORDER_COLS.STATUS)} AS status,
      1 AS order_count
    FROM ${TABLES.orderList}
    WHERE TRIM(COALESCE(${quoteIdent(ORDER_LIST_COLS.CANCELED_AT)}::text, '')) <> ''
      AND ${quoteIdent(ORDER_COLS.STATUS)} IN ('${STATUS.REFUNDED}', '${STATUS.PENDING_REFUND}')
  ),
  all_transactions AS (
      SELECT id_order, event_date, amount, cost, refund_amount, status, order_count FROM income_stream
      UNION ALL
      SELECT id_order, event_date, amount, cost, refund_amount, status, order_count FROM refund_stream
  ),
  filtered_trans AS (
    SELECT *
    FROM all_transactions, params
    WHERE event_date IS NOT NULL
      AND event_date >= params.year_start
      AND event_date < params.next_year_start
      AND (params.limit_to_today IS FALSE OR event_date <= ${CURRENT_DATE_SQL})
  ),
  monthly_stats AS (
    SELECT
      EXTRACT(MONTH FROM event_date) AS month_num,
      SUM(CASE WHEN status = '${STATUS.PAID}' THEN 1 ELSE 0 END) AS total_orders,
      SUM(CASE WHEN status IN ('${STATUS.REFUNDED}', '${STATUS.PENDING_REFUND}') THEN 1 ELSE 0 END) AS total_canceled,
      SUM(amount) AS net_revenue,
      SUM(cost) AS total_cost,
      SUM(amount) - SUM(cost) AS net_profit,
      SUM(refund_amount) AS total_refund
    FROM filtered_trans
    GROUP BY 1
  )
  SELECT
    months.month_num,
    months.month_label,
    COALESCE(monthly_stats.total_orders, 0) AS total_orders,
    COALESCE(monthly_stats.total_canceled, 0) AS total_canceled,
    COALESCE(monthly_stats.net_revenue, 0) AS total_revenue,
    COALESCE(monthly_stats.net_profit, 0) AS total_profit,
    COALESCE(monthly_stats.total_refund, 0) AS total_refund
  FROM months
  LEFT JOIN monthly_stats ON months.month_num = monthly_stats.month_num
  ORDER BY months.month_num;
`;

const buildRangeCompareStatsQuery = () => `
  WITH params AS (
    SELECT
      ?::date AS c0,
      ?::date AS c1,
      ?::date AS p0,
      ?::date AS p1
  ),
  income_stream AS (
    SELECT
      ${orderIdStringColumn},
      ${createDateNormalization(quoteIdent(ORDER_COLS.ORDER_DATE))} AS event_date,
      ${orderPriceColumn} AS amount,
      ${createNumericExtraction(orderCostColumn)} AS cost,
      0::numeric AS refund_amount,
      ${quoteIdent(ORDER_COLS.STATUS)} AS status,
      1 AS order_count
    FROM ${TABLES.orderList}
    WHERE TRIM(${quoteIdent(ORDER_COLS.ORDER_DATE)}::text) <> ''
      AND ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS.PAID}'
  ),
  refund_stream AS (
    SELECT
      ${orderIdStringColumn} AS id_order,
      ${createDateNormalization(quoteIdent(ORDER_LIST_COLS.CANCELED_AT))} AS event_date,
      CASE
        WHEN ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS.REFUNDED}' THEN (${orderPriceColumn} * -1)
        ELSE 0
      END AS amount,
      CASE
        WHEN ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS.REFUNDED}' THEN (${createNumericExtraction(orderCostColumn)} * -1)
        ELSE 0
      END AS cost,
      ${createNumericExtraction(orderRefundColumn)} AS refund_amount,
      ${quoteIdent(ORDER_COLS.STATUS)} AS status,
      1 AS order_count
    FROM ${TABLES.orderList}
    WHERE TRIM(COALESCE(${quoteIdent(ORDER_LIST_COLS.CANCELED_AT)}::text, '')) <> ''
      AND ${quoteIdent(ORDER_COLS.STATUS)} IN ('${STATUS.REFUNDED}', '${STATUS.PENDING_REFUND}')
  ),
  all_transactions AS (
    SELECT id_order, event_date, amount, cost, refund_amount, status, order_count FROM income_stream
    UNION ALL
    SELECT id_order, event_date, amount, cost, refund_amount, status, order_count FROM refund_stream
  )
  SELECT
    COALESCE(SUM(CASE
      WHEN t.event_date >= p.c0 AND t.event_date <= p.c1 AND t.status = '${STATUS.PAID}' THEN 1
      ELSE 0
    END), 0)::bigint AS total_orders_curr,
    COALESCE(SUM(CASE
      WHEN t.event_date >= p.p0 AND t.event_date <= p.p1 AND t.status = '${STATUS.PAID}' THEN 1
      ELSE 0
    END), 0)::bigint AS total_orders_prev,
    COALESCE(SUM(CASE
      WHEN t.event_date >= p.c0 AND t.event_date <= p.c1
        AND t.status IN ('${STATUS.REFUNDED}', '${STATUS.PENDING_REFUND}') THEN 1
      ELSE 0
    END), 0)::bigint AS total_canceled_curr,
    COALESCE(SUM(CASE
      WHEN t.event_date >= p.p0 AND t.event_date <= p.p1
        AND t.status IN ('${STATUS.REFUNDED}', '${STATUS.PENDING_REFUND}') THEN 1
      ELSE 0
    END), 0)::bigint AS total_canceled_prev,
    COALESCE(SUM(CASE WHEN t.event_date >= p.c0 AND t.event_date <= p.c1 THEN t.amount END), 0) AS net_revenue_curr,
    COALESCE(SUM(CASE WHEN t.event_date >= p.p0 AND t.event_date <= p.p1 THEN t.amount END), 0) AS net_revenue_prev,
    COALESCE(SUM(CASE WHEN t.event_date >= p.c0 AND t.event_date <= p.c1 THEN t.cost END), 0) AS total_cost_curr,
    COALESCE(SUM(CASE WHEN t.event_date >= p.p0 AND t.event_date <= p.p1 THEN t.cost END), 0) AS total_cost_prev,
    COALESCE(SUM(CASE
      WHEN t.event_date >= p.c0 AND t.event_date <= p.c1 THEN (t.amount - t.cost)
    END), 0) AS net_profit_curr,
    COALESCE(SUM(CASE
      WHEN t.event_date >= p.p0 AND t.event_date <= p.p1 THEN (t.amount - t.cost)
    END), 0) AS net_profit_prev,
    COALESCE(SUM(CASE WHEN t.event_date >= p.c0 AND t.event_date <= p.c1 THEN t.refund_amount END), 0) AS total_refund_curr,
    COALESCE(SUM(CASE WHEN t.event_date >= p.p0 AND t.event_date <= p.p1 THEN t.refund_amount END), 0) AS total_refund_prev
  FROM all_transactions t
  CROSS JOIN params p
  WHERE t.event_date IS NOT NULL
    AND (
      (t.event_date >= p.c0 AND t.event_date <= p.c1)
      OR (t.event_date >= p.p0 AND t.event_date <= p.p1)
    )
`;

const buildRangeMonthlyChartQuery = () => `
  WITH params AS (
    SELECT ?::date AS c0, ?::date AS c1
  ),
  income_stream AS (
    SELECT
      ${orderIdStringColumn},
      ${createDateNormalization(quoteIdent(ORDER_COLS.ORDER_DATE))} AS event_date,
      ${orderPriceColumn} AS amount,
      ${createNumericExtraction(orderCostColumn)} AS cost,
      0::numeric AS refund_amount,
      ${quoteIdent(ORDER_COLS.STATUS)} AS status,
      1 AS order_count
    FROM ${TABLES.orderList}
    WHERE TRIM(${quoteIdent(ORDER_COLS.ORDER_DATE)}::text) <> ''
      AND ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS.PAID}'
  ),
  refund_stream AS (
    SELECT
      ${orderIdStringColumn} AS id_order,
      ${createDateNormalization(quoteIdent(ORDER_LIST_COLS.CANCELED_AT))} AS event_date,
      CASE
        WHEN ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS.REFUNDED}' THEN (${orderPriceColumn} * -1)
        ELSE 0
      END AS amount,
      CASE
        WHEN ${quoteIdent(ORDER_COLS.STATUS)} = '${STATUS.REFUNDED}' THEN (${createNumericExtraction(orderCostColumn)} * -1)
        ELSE 0
      END AS cost,
      ${createNumericExtraction(orderRefundColumn)} AS refund_amount,
      ${quoteIdent(ORDER_COLS.STATUS)} AS status,
      1 AS order_count
    FROM ${TABLES.orderList}
    WHERE TRIM(COALESCE(${quoteIdent(ORDER_LIST_COLS.CANCELED_AT)}::text, '')) <> ''
      AND ${quoteIdent(ORDER_COLS.STATUS)} IN ('${STATUS.REFUNDED}', '${STATUS.PENDING_REFUND}')
  ),
  all_transactions AS (
    SELECT id_order, event_date, amount, cost, refund_amount, status, order_count FROM income_stream
    UNION ALL
    SELECT id_order, event_date, amount, cost, refund_amount, status, order_count FROM refund_stream
  ),
  filtered_curr AS (
    SELECT t.*
    FROM all_transactions t
    CROSS JOIN params p
    WHERE t.event_date IS NOT NULL
      AND t.event_date >= p.c0
      AND t.event_date <= p.c1
  ),
  month_bucket AS (
    SELECT gs::date AS month_start
    FROM params,
    generate_series(
      date_trunc('month', (SELECT c0 FROM params))::date,
      date_trunc('month', (SELECT c1 FROM params))::date,
      '1 month'::interval
    ) AS gs
  ),
  monthly_stats AS (
    SELECT
      date_trunc('month', event_date)::date AS month_start,
      SUM(CASE WHEN status = '${STATUS.PAID}' THEN 1 ELSE 0 END) AS total_orders,
      SUM(CASE WHEN status IN ('${STATUS.REFUNDED}', '${STATUS.PENDING_REFUND}') THEN 1 ELSE 0 END) AS total_canceled,
      SUM(amount) AS net_revenue,
      SUM(cost) AS total_cost,
      SUM(amount) - SUM(cost) AS net_profit,
      SUM(refund_amount) AS total_refund
    FROM filtered_curr
    GROUP BY 1
  )
  SELECT
    EXTRACT(MONTH FROM mb.month_start)::int AS month_num,
    EXTRACT(YEAR FROM mb.month_start)::int AS year_num,
    COALESCE(ms.total_orders, 0)::bigint AS total_orders,
    COALESCE(ms.total_canceled, 0)::bigint AS total_canceled,
    COALESCE(ms.net_revenue, 0) AS total_revenue,
    COALESCE(ms.net_profit, 0) AS total_profit,
    COALESCE(ms.total_refund, 0) AS total_refund
  FROM month_bucket mb
  LEFT JOIN monthly_stats ms ON ms.month_start = mb.month_start
  ORDER BY mb.month_start;
`;

module.exports = {
  buildStatsBindings,
  buildStatsQuery,
  buildYearsQuery,
  buildChartsQuery,
  buildRangeCompareStatsQuery,
  buildRangeMonthlyChartQuery,
};
