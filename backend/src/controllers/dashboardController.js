const { db } = require("../db");
const Helpers = require("../../helpers");
const { DB_SCHEMA, getDefinition, tableName } = require("../config/dbSchema");
const {
    createDateNormalization,
    createYearExtraction,
    createNumericExtraction,
    quoteIdent,
} = require("../utils/sql");

const ORDER_DEF = getDefinition("ORDER_LIST");
const PAYMENT_RECEIPT_DEF = getDefinition("PAYMENT_RECEIPT");

const TABLES = {
    orderList: tableName(DB_SCHEMA.ORDER_LIST.TABLE),
    orderExpired: tableName(DB_SCHEMA.ORDER_EXPIRED.TABLE),
    orderCanceled: tableName(DB_SCHEMA.ORDER_CANCELED.TABLE),
    paymentReceipt: tableName(DB_SCHEMA.PAYMENT_RECEIPT.TABLE),
};

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const timezoneCandidate =
    typeof process.env.APP_TIMEZONE === "string" &&
    /^[A-Za-z0-9_\/+-]+$/.test(process.env.APP_TIMEZONE) ?
    process.env.APP_TIMEZONE :
    DEFAULT_TIMEZONE;
const CURRENT_DATE_SQL = `(CURRENT_TIMESTAMP AT TIME ZONE '${timezoneCandidate}')::date`;

const normalizedYearCase = createYearExtraction("raw_date");

// --- 1. DASHBOARD STATS (Thẻ thống kê) ---
const dashboardStats = async(_req, res) => {
    const periods = Helpers.calculatePeriods();
    try {
        const bindings = {
            prevStart: periods.previousStart,
            prevEnd: periods.previousEnd,
            currStart: periods.currentStart,
            currEnd: periods.currentEnd,
        };

        const q = `
      WITH params AS (
        SELECT
          :prevStart::date AS prev_start,
          :prevEnd::date AS prev_end,
          :currStart::date AS curr_start,
          :currEnd::date AS curr_end
      ),
      valid_orders AS (
        -- Dùng UNION ALL để giữ lại cả các đơn có ID trùng nhau giữa 2 bảng
        SELECT
          ${quoteIdent(ORDER_DEF.columns.id)} AS order_id,
          'active' as status, -- Đánh dấu nguồn dữ liệu
          ${createDateNormalization(quoteIdent(ORDER_DEF.columns.orderDate))} AS registration_date,
          ${createDateNormalization(quoteIdent(ORDER_DEF.columns.expiredDate))} AS expiry_date,
          ${createNumericExtraction(quoteIdent(ORDER_DEF.columns.cost))} AS cost_value,
          ${createNumericExtraction(quoteIdent(ORDER_DEF.columns.price))} AS price_value
        FROM ${TABLES.orderList}
        WHERE TRIM(${quoteIdent(ORDER_DEF.columns.orderDate)}::text) <> ''
        
        UNION ALL -- QUAN TRỌNG: Sửa thành UNION ALL
        
        SELECT
          ${quoteIdent(ORDER_DEF.columns.id)} AS order_id,
          'expired' as status,
          ${createDateNormalization(quoteIdent(ORDER_DEF.columns.orderDate))} AS registration_date,
          ${createDateNormalization(quoteIdent(ORDER_DEF.columns.expiredDate))} AS expiry_date,
          ${createNumericExtraction(quoteIdent(ORDER_DEF.columns.cost))} AS cost_value,
          ${createNumericExtraction(quoteIdent(ORDER_DEF.columns.price))} AS price_value
        FROM ${TABLES.orderExpired}
        WHERE TRIM(${quoteIdent(ORDER_DEF.columns.orderDate)}::text) <> ''
      ),
      canceled_data AS (
          SELECT
            "id" AS order_id,
            'canceled' as status,
            ${createDateNormalization("createdate")} AS registration_date,
            NULL::date AS expiry_date,
            ${createNumericExtraction(quoteIdent(ORDER_DEF.columns.cost))} AS cost_value,
            ${createNumericExtraction(quoteIdent(ORDER_DEF.columns.price))} AS price_value
          FROM ${TABLES.orderCanceled}
          WHERE TRIM(createdate::text) <> ''
      ),
      all_data AS (
          SELECT *, FALSE as is_canceled FROM valid_orders
          UNION ALL
          SELECT *, TRUE as is_canceled FROM canceled_data
      )
      SELECT
        -- Tổng đơn hàng: Đếm tất cả dòng không hủy
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

        const result = await db.raw(q, bindings);
        const data = (result.rows && result.rows[0]) || {};
        res.json({
            totalOrders: {
                current: Number(data.total_orders_current || 0),
                previous: Number(data.total_orders_previous || 0),
            },
            totalImports: {
                current: Number(data.total_imports_current || 0),
                previous: Number(data.total_imports_previous || 0),
            },
            totalProfit: {
                current: Number(data.total_profit_current || 0),
                previous: Number(data.total_profit_previous || 0),
            },
            overdueOrders: {
                count: Number(data.overdue_orders_count || 0),
            },
            periods,
        });
    } catch (error) {
        console.error("[dashboard] Query failed (stats):", error);
        res.status(500).json({
            error: "Khong the tai so lieu dashboard.",
        });
    }
};

// --- 2. DASHBOARD YEARS ---
const dashboardYears = async(_req, res) => {
    const q = `
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

    try {
        const result = await db.raw(q);
        const years = (result.rows || []).map((row) => Number(row.year_value));
        res.json({
            years
        });
    } catch (error) {
        console.error("[dashboard] Query failed (years):", error);
        res.status(500).json({
            error: "Khong the tai danh sach nam.",
        });
    }
};

// --- 3. DASHBOARD CHARTS (Biểu đồ) ---
const dashboardCharts = async(req, res) => {
    const currentYear = new Date().getFullYear();
    const filterYear = req.query.year ? Number(req.query.year) : currentYear;

    // Lấy tên cột giá
    const orderPriceColumn = quoteIdent(ORDER_DEF.columns.price);

    // Giả định tên cột mã đơn hàng trong DB là 'id_order' (như trong ảnh bạn gửi)
    const orderIdStringColumn = '"id_order"';

    const q = `
    WITH params AS (
      SELECT
        make_date(:year, 1, 1) AS year_start,
        make_date(:year + 1, 1, 1) AS next_year_start
    ),
    months AS (
      SELECT gs AS month_num, TO_CHAR(gs, '"T"FM99') AS month_label
      FROM generate_series(1, 12) AS gs
    ),
    -- 1. NGUỒN THU (+): Lấy đơn hàng từ Order List và Expired
    income_stream AS (
      -- SELECT thêm cột id_order để UNION phân biệt được các đơn trùng ngày/giá
      SELECT
        ${orderIdStringColumn}, 
        ${createDateNormalization(quoteIdent(ORDER_DEF.columns.orderDate))} AS event_date,
        ${orderPriceColumn} AS amount,
        1 AS order_count
      FROM ${TABLES.orderList}
      WHERE TRIM(${quoteIdent(ORDER_DEF.columns.orderDate)}::text) <> ''
      
      UNION -- Quay lại dùng UNION (DISTINCT) để loại bỏ nếu đơn đó nằm ở cả 2 bảng
      
      SELECT
        ${orderIdStringColumn},
        ${createDateNormalization(quoteIdent(ORDER_DEF.columns.orderDate))} AS event_date,
        ${orderPriceColumn} AS amount,
        1 AS order_count
      FROM ${TABLES.orderExpired}
      WHERE TRIM(${quoteIdent(ORDER_DEF.columns.orderDate)}::text) <> ''
    ),
    -- 2. NGUỒN CHI (-): Lấy đơn hoàn tiền
    refund_stream AS (
      SELECT
        NULL AS id_order, -- Đơn hoàn không cần check trùng ID với đơn bán
        ${createDateNormalization("createdate")} AS event_date,
        (${orderPriceColumn} * -1) AS amount,
        0 AS order_count
      FROM ${TABLES.orderCanceled}
      WHERE TRIM(createdate::text) <> ''
        AND status = 'Đã Hoàn'
    ),
    -- 3. TỔNG HỢP GIAO DỊCH
    all_transactions AS (
        SELECT id_order, event_date, amount, order_count FROM income_stream
        UNION ALL
        SELECT id_order, event_date, amount, order_count FROM refund_stream
    ),
    -- 4. LỌC THEO NĂM
    filtered_trans AS (
      SELECT *
      FROM all_transactions, params
      WHERE event_date IS NOT NULL
        AND event_date >= params.year_start
        AND event_date < params.next_year_start
    ),
    -- 5. TÍNH TOÁN THEO THÁNG
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

    try {
        const result = await db.raw(q, {
            year: filterYear
        });
        res.json({
            year: filterYear,
            months: result.rows || [],
        });
    } catch (error) {
        console.error("[dashboard] Query failed (charts):", error);
        res.status(500).json({
            error: "Khong the tai bieu do dashboard.",
        });
    }
};

module.exports = {
    dashboardStats,
    dashboardYears,
    dashboardCharts,
};