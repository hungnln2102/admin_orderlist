const {
  createDateNormalization,
  createNumericExtraction,
  quoteIdent,
} = require("../../utils/sql");
const { DB_SCHEMA } = require("../../config/dbSchema");
const {
  ORDER_DEF,
  TABLES,
  CURRENT_DATE_SQL,
  normalizedYearCase,
} = require("./constants");

const ORDER_COLS = ORDER_DEF.COLS;
const ORDER_CANCELED_COLS = DB_SCHEMA.ORDER_CANCELED.COLS;

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
      'active' as status,
      ${createDateNormalization(quoteIdent(ORDER_COLS.ORDER_DATE))} AS registration_date,
      ${createDateNormalization(quoteIdent(ORDER_COLS.ORDER_EXPIRED))} AS expiry_date,
      ${createNumericExtraction(quoteIdent(ORDER_COLS.COST))} AS cost_value,
      ${createNumericExtraction(quoteIdent(ORDER_COLS.PRICE))} AS price_value
    FROM ${TABLES.orderList}
    WHERE TRIM(${quoteIdent(ORDER_COLS.ORDER_DATE)}::text) <> ''
    
    UNION ALL
    
    SELECT
      ${quoteIdent(ORDER_COLS.ID)} AS order_id,
      'expired' as status,
      ${createDateNormalization(quoteIdent(ORDER_COLS.ORDER_DATE))} AS registration_date,
      ${createDateNormalization(quoteIdent(ORDER_COLS.ORDER_EXPIRED))} AS expiry_date,
      ${createNumericExtraction(quoteIdent(ORDER_COLS.COST))} AS cost_value,
      ${createNumericExtraction(quoteIdent(ORDER_COLS.PRICE))} AS price_value
    FROM ${TABLES.orderExpired}
    WHERE TRIM(${quoteIdent(ORDER_COLS.ORDER_DATE)}::text) <> ''
  ),
  canceled_data AS (
      SELECT
        "id" AS order_id,
        'canceled' as status,
        ${createDateNormalization(quoteIdent(ORDER_CANCELED_COLS.CREATED_AT))} AS registration_date,
        NULL::date AS expiry_date,
        ${createNumericExtraction(quoteIdent(ORDER_COLS.COST))} AS cost_value,
        ${createNumericExtraction(quoteIdent(ORDER_COLS.PRICE))} AS price_value
      FROM ${TABLES.orderCanceled}
      WHERE TRIM(${quoteIdent(ORDER_CANCELED_COLS.CREATED_AT)}::text) <> ''
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
      WHEN registration_date BETWEEN params.curr_start AND params.curr_end THEN price_value - cost_value
      ELSE 0
    END), 0) AS total_profit_current,
    
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN params.prev_start AND params.prev_end THEN price_value - cost_value
      ELSE 0
    END), 0) AS total_profit_previous,
    
    (
      SELECT COUNT(*)
      FROM valid_orders sub
      WHERE sub.expiry_date IS NOT NULL
        AND (sub.expiry_date - ${CURRENT_DATE_SQL}) BETWEEN 1 AND 4
    ) AS overdue_orders_count
  FROM all_data, params;
`;

const buildYearsQuery = () => `
  WITH all_dates AS (
    SELECT order_date::text AS raw_date FROM ${TABLES.orderList}
    UNION ALL
    SELECT order_date::text AS raw_date FROM ${TABLES.orderExpired}
    UNION ALL
    SELECT createdate::text AS raw_date FROM ${TABLES.orderCanceled}
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
const orderIdStringColumn = quoteIdent(ORDER_COLS.ID_ORDER);

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
      1 AS order_count
    FROM ${TABLES.orderList}
    WHERE TRIM(${quoteIdent(ORDER_COLS.ORDER_DATE)}::text) <> ''
    
    UNION
    
    SELECT
      ${orderIdStringColumn},
      ${createDateNormalization(quoteIdent(ORDER_COLS.ORDER_DATE))} AS event_date,
      ${orderPriceColumn} AS amount,
      1 AS order_count
    FROM ${TABLES.orderExpired}
    WHERE TRIM(${quoteIdent(ORDER_COLS.ORDER_DATE)}::text) <> ''
  ),
  refund_stream AS (
    SELECT
      NULL AS id_order,
      ${createDateNormalization(quoteIdent(ORDER_CANCELED_COLS.CREATED_AT))} AS event_date,
      (${orderPriceColumn} * -1) AS amount,
      0 AS order_count
    FROM ${TABLES.orderCanceled}
    WHERE TRIM(${quoteIdent(ORDER_CANCELED_COLS.CREATED_AT)}::text) <> ''
      AND status = 'Đã Hoàn'
  ),
  all_transactions AS (
      SELECT id_order, event_date, amount, order_count FROM income_stream
      UNION ALL
      SELECT id_order, event_date, amount, order_count FROM refund_stream
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
      SUM(amount) AS net_revenue,       
      SUM(order_count) AS total_orders, 
      SUM(CASE WHEN amount < 0 THEN 1 ELSE 0 END) AS total_refunds
    FROM filtered_trans
    GROUP BY 1
  )
  SELECT
    months.month_num,
    months.month_label,
    COALESCE(monthly_stats.total_orders, 0) AS total_orders,
    COALESCE(monthly_stats.total_refunds, 0) AS total_canceled,
    COALESCE(monthly_stats.net_revenue, 0) AS total_revenue
  FROM months
  LEFT JOIN monthly_stats ON months.month_num = monthly_stats.month_num
  ORDER BY months.month_num;
`;

module.exports = {
  buildStatsBindings,
  buildStatsQuery,
  buildYearsQuery,
  buildChartsQuery,
};
