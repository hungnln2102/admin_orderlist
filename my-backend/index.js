require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const updateDatabaseTask = require("./scheduler");
const Helpers = require("./helpers");

const app = express();
const port = Number(process.env.PORT) || 3001;

const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const createDateNormalization = (column) => `
  CASE
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
      THEN TO_DATE(TRIM(${column}::text), 'DD/MM/YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      THEN TRIM(${column}::text)::date
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}/[0-9]{2}/[0-9]{2}$'
      THEN TO_DATE(TRIM(${column}::text), 'YYYY/MM/DD')
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$'
      THEN TO_DATE(TRIM(${column}::text), 'DD-MM-YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{8}$'
      THEN TO_DATE(TRIM(${column}::text), 'YYYYMMDD')
    ELSE NULL
  END
`;

const createYearExtraction = (column) => `
  CASE
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}$'
      THEN TRIM(${column}::text)::int
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
      THEN SUBSTRING(TRIM(${column}::text) FROM 7 FOR 4)::int
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$'
      THEN SUBSTRING(TRIM(${column}::text) FROM 7 FOR 4)::int
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      THEN SUBSTRING(TRIM(${column}::text) FROM 1 FOR 4)::int
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}/[0-9]{2}/[0-9]{2}$'
      THEN SUBSTRING(TRIM(${column}::text) FROM 1 FOR 4)::int
    WHEN TRIM(${column}::text) ~ '^[0-9]{8}$'
      THEN SUBSTRING(TRIM(${column}::text) FROM 1 FOR 4)::int
    ELSE NULL
  END
`;

const normalizeDateInput = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const converted = Helpers.convertDMYToYMD(trimmed);
  if (!converted || String(converted).trim() === "") return null;
  return converted;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked request from ${origin}`));
    },
  })
);

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const timezoneCandidate =
  typeof process.env.APP_TIMEZONE === "string" &&
  /^[A-Za-z0-9_\/+-]+$/.test(process.env.APP_TIMEZONE)
    ? process.env.APP_TIMEZONE
    : DEFAULT_TIMEZONE;
const CURRENT_DATE_SQL = `(CURRENT_TIMESTAMP AT TIME ZONE '${timezoneCandidate}')::date`;

const dashStatsQuery = `
  WITH period_data AS (
    SELECT
      id,
      CASE
        WHEN TRIM(ngay_dang_ki::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
          THEN TO_DATE(TRIM(ngay_dang_ki::text), 'DD/MM/YYYY')
        WHEN TRIM(ngay_dang_ki::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          THEN TRIM(ngay_dang_ki::text)::date
        ELSE NULL
      END AS registration_date,
      CASE
        WHEN TRIM(het_han::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
          THEN TO_DATE(TRIM(het_han::text), 'DD/MM/YYYY')
        WHEN TRIM(het_han::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          THEN TRIM(het_han::text)::date
        ELSE NULL
      END AS expiry_date,
      COALESCE(gia_nhap, 0) AS gia_nhap,
      COALESCE(gia_ban, 0) AS gia_ban
    FROM mavryk.order_list
  )
  SELECT
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN $3::date AND $4::date THEN 1
      ELSE 0
    END), 0) AS total_orders_current,
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN $1::date AND $2::date THEN 1
      ELSE 0
    END), 0) AS total_orders_previous,
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN $3::date AND $4::date THEN gia_nhap
      ELSE 0
    END), 0) AS total_imports_current,
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN $1::date AND $2::date THEN gia_nhap
      ELSE 0
    END), 0) AS total_imports_previous,
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN $3::date AND $4::date THEN (gia_ban - gia_nhap)
      ELSE 0
    END), 0) AS total_profit_current,
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN $1::date AND $2::date THEN (gia_ban - gia_nhap)
      ELSE 0
    END), 0) AS total_profit_previous,
    (
      SELECT COUNT(id)
      FROM period_data sub
      WHERE sub.expiry_date IS NOT NULL
        AND (sub.expiry_date - ${CURRENT_DATE_SQL}) BETWEEN 1 AND 4
    ) AS overdue_orders_count
  FROM period_data;
`;

const normalizedYearCase = `
  CASE
    WHEN raw_date IS NULL OR TRIM(raw_date) = '' THEN NULL
    WHEN TRIM(raw_date) ~ '^[0-9]{4}$' THEN TRIM(raw_date)::int
    WHEN TRIM(raw_date) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
      THEN SUBSTRING(TRIM(raw_date) FROM 7 FOR 4)::int
    WHEN TRIM(raw_date) ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$'
      THEN SUBSTRING(TRIM(raw_date) FROM 7 FOR 4)::int
    WHEN TRIM(raw_date) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      THEN SUBSTRING(TRIM(raw_date) FROM 1 FOR 4)::int
    WHEN TRIM(raw_date) ~ '^[0-9]{4}/[0-9]{2}/[0-9]{2}$'
      THEN SUBSTRING(TRIM(raw_date) FROM 1 FOR 4)::int
    WHEN TRIM(raw_date) ~ '^[0-9]{8}$'
      THEN SUBSTRING(TRIM(raw_date) FROM 1 FOR 4)::int
    ELSE NULL
  END
`;

app.get("/api/dashboard/stats", async (_req, res) => {
  console.log("[GET] /api/dashboard/stats");
  const periods = Helpers.calculatePeriods();

  try {
    const result = await pool.query(dashStatsQuery, [
      periods.previousStart,
      periods.previousEnd,
      periods.currentStart,
      periods.currentEnd,
    ]);

    const data = result.rows[0];
    res.json({
      totalOrders: {
        current: Number(data.total_orders_current),
        previous: Number(data.total_orders_previous),
      },
      totalImports: {
        current: Number(data.total_imports_current),
        previous: Number(data.total_imports_previous),
      },
      totalProfit: {
        current: Number(data.total_profit_current),
        previous: Number(data.total_profit_previous),
      },
      overdueOrders: {
        count: Number(data.overdue_orders_count),
      },
      periods,
    });
  } catch (error) {
    console.error("Query failed (GET /api/dashboard/stats):", error);
    res.status(500).json({
      error: "Unable to load dashboard statistics.",
    });
  }
});

app.get("/api/dashboard/years", async (_req, res) => {
  console.log("[GET] /api/dashboard/years");
  const q = `
    WITH all_dates AS (
      SELECT ngay_dang_ki::text AS raw_date FROM mavryk.order_list
      UNION ALL
      SELECT ngay_dang_ki::text AS raw_date FROM mavryk.order_expried
      UNION ALL
      SELECT ngay_dang_ki::text AS raw_date FROM mavryk.order_canceled
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
    const result = await pool.query(q);
    const years = result.rows.map((row) => Number(row.year_value));
    res.json({ years });
  } catch (error) {
    console.error("Query failed (GET /api/dashboard/years):", error);
    res.status(500).json({
      error: "Unable to load available years.",
    });
  }
});

app.get("/api/dashboard/charts", async (req, res) => {
  console.log("[GET] /api/dashboard/charts");
  const currentYear = new Date().getFullYear();
  const filterYear = req.query.year ? Number(req.query.year) : currentYear;

  const orderDateCase = createDateNormalization("ngay_dang_ki");
  const orderYearCase = createYearExtraction("ngay_dang_ki");

  const q = `
    WITH all_orders AS (
      SELECT
        ${orderDateCase} AS order_date,
        ${orderYearCase} AS order_year,
        COALESCE(gia_ban, 0) AS gia_ban,
        FALSE AS is_canceled
      FROM mavryk.order_list
      WHERE TRIM(ngay_dang_ki::text) <> ''
      UNION ALL
      SELECT
        ${orderDateCase} AS order_date,
        ${orderYearCase} AS order_year,
        COALESCE(gia_ban, 0) AS gia_ban,
        FALSE AS is_canceled
      FROM mavryk.order_expried
      WHERE TRIM(ngay_dang_ki::text) <> ''
      UNION ALL
      SELECT
        ${orderDateCase} AS order_date,
        ${orderYearCase} AS order_year,
        COALESCE(gia_ban, 0) AS gia_ban,
        TRUE AS is_canceled
      FROM mavryk.order_canceled
      WHERE TRIM(ngay_dang_ki::text) <> ''
    ),
    filtered_orders AS (
      SELECT *
      FROM all_orders
      WHERE order_date IS NOT NULL
        AND order_year = $1
    ),
    monthly_stats AS (
      SELECT
        EXTRACT(MONTH FROM order_date) AS month_num,
        TO_CHAR(order_date, '"T"FM9') AS month_label,
        COALESCE(SUM(gia_ban), 0) AS total_sales,
        COUNT(*) AS total_orders,
        COALESCE(SUM(CASE WHEN is_canceled THEN 1 ELSE 0 END), 0) AS total_canceled
      FROM filtered_orders
      GROUP BY 1, 2
      ORDER BY 1
    )
    SELECT
      months.month_label,
      COALESCE(monthly_stats.total_sales, 0) AS total_sales,
      COALESCE(monthly_stats.total_orders, 0) AS total_orders,
      COALESCE(monthly_stats.total_canceled, 0) AS total_canceled
    FROM (
      VALUES
      (1, 'T1'), (2, 'T2'), (3, 'T3'), (4, 'T4'), (5, 'T5'), (6, 'T6'),
      (7, 'T7'), (8, 'T8'), (9, 'T9'), (10, 'T10'), (11, 'T11'), (12, 'T12')
    ) AS months(month_num, month_label)
    LEFT JOIN monthly_stats
      ON months.month_num = monthly_stats.month_num
    ORDER BY months.month_num;
  `;

  try {
    const result = await pool.query(q, [filterYear]);
    const rows = result.rows;

    const revenueData = rows.map((row) => ({
      month: row.month_label,
      total_sales: Number(row.total_sales),
    }));

    const orderStatusData = rows.map((row) => ({
      month: row.month_label,
      total_orders: Number(row.total_orders),
      total_canceled: Number(row.total_canceled),
    }));

    res.json({ revenueData, orderStatusData });
  } catch (error) {
    console.error("Query failed (GET /api/dashboard/charts):", error);
    res.status(500).json({
      error: "Unable to load chart data.",
    });
  }
});

app.get("/api/orders", async (_req, res) => {
  console.log("[GET] /api/orders");
  const expiryDateCase = createDateNormalization("het_han");

  const q = `
    WITH normalized AS (
      SELECT
        *,
        ${expiryDateCase} AS expiry_date
      FROM mavryk.order_list
    )
    SELECT
      normalized.*,
      (normalized.expiry_date - ${CURRENT_DATE_SQL}) AS so_ngay_con_lai
    FROM normalized;
  `;

  try {
    const result = await pool.query(q);
    res.json(result.rows);
  } catch (error) {
    console.error("Query failed (GET /api/orders):", error);
    res.status(500).json({
      error: "Unable to load order list.",
    });
  }
});

app.get("/api/supplies", async (_req, res) => {
  console.log("[GET] /api/supplies");
  try {
    const result = await pool.query(
      "SELECT id, source_name FROM mavryk.supply ORDER BY source_name;"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Query failed (GET /api/supplies):", error);
    res.status(500).json({
      error: "Unable to load suppliers.",
    });
  }
});

app.get("/api/supplies/:supplyId/products", async (req, res) => {
  const { supplyId } = req.params;
  console.log(`[GET] /api/supplies/${supplyId}/products`);

  const q = `
    SELECT DISTINCT pp.id, pp.san_pham
    FROM mavryk.supply_price sp
    JOIN mavryk.product_price pp ON sp.product_id = pp.id
    WHERE sp.source_id = $1
    ORDER BY pp.san_pham;
  `;

  try {
    const result = await pool.query(q, [supplyId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Query failed (GET /api/supplies/:id/products):", error);
    res.status(500).json({
      error: "Unable to load products for this supplier.",
    });
  }
});

app.get("/api/products", async (_req, res) => {
  console.log("[GET] /api/products");
  const q = `
    SELECT id, san_pham
    FROM mavryk.product_price
    ORDER BY san_pham;
  `;

  try {
    const result = await pool.query(q);
    res.json(result.rows);
  } catch (error) {
    console.error("Query failed (GET /api/products):", error);
    res.status(500).json({
      error: "Unable to load products.",
    });
  }
});

app.get("/api/products/supplies-by-name/:productName", async (req, res) => {
  const { productName } = req.params;
  console.log(`[GET] /api/products/supplies-by-name/${productName}`);

  const q = `
    SELECT s.id, s.source_name
    FROM mavryk.supply s
    JOIN mavryk.supply_price sp ON s.id = sp.source_id
    JOIN mavryk.product_price pp ON sp.product_id = pp.id
    WHERE pp.san_pham = $1 AND pp.is_active = TRUE
    ORDER BY s.source_name;
  `;

  try {
    const result = await pool.query(q, [productName]);
    res.json(result.rows);
  } catch (error) {
    console.error("Query failed (GET /api/products/supplies-by-name):", error);
    res.status(500).json({
      error: "Unable to load suppliers for the requested product.",
    });
  }
});

app.post("/api/calculate-price", async (req, res) => {
  console.log("[POST] /api/calculate-price");
  const { san_pham_name, id_don_hang, customer_type } = req.body || {};

  if (!san_pham_name || !id_don_hang) {
    return res.status(400).json({
      error: "Missing required fields: san_pham_name and id_don_hang.",
    });
  }

  const priceQuery = `
    SELECT
      (
        SELECT MAX(sp_max.price)
        FROM mavryk.supply_price sp_max
        JOIN mavryk.product_price pp_max ON sp_max.product_id = pp_max.id
        WHERE pp_max.san_pham = $1
      ) AS gia_nhap_co_so,
      pp.pct_ctv,
      pp.pct_khach
    FROM mavryk.product_price pp
    WHERE pp.san_pham = $1
    LIMIT 1;
  `;

  try {
    const priceResult = await pool.query(priceQuery, [san_pham_name]);
    const productPricing = priceResult.rows[0];

    if (!productPricing || productPricing.gia_nhap_co_so === null) {
      return res
        .status(404)
        .json({ error: "No pricing data found for the selected product." });
    }

    const basePrice = Number(productPricing.gia_nhap_co_so);
    const pctCtv = Number(productPricing.pct_ctv) || 1.0;
    const pctCustomer = Number(productPricing.pct_khach) || 1.0;

    const normalizeType = (value) => (value || "").toUpperCase();
    const inferredMavc = normalizeType(id_don_hang).startsWith("MAVC");
    const explicitMavc = normalizeType(customer_type) === "MAVC";
    const isMavc = inferredMavc || explicitMavc;

    const finalPrice = Math.round(isMavc ? basePrice * pctCtv : basePrice * pctCustomer);

    const months = Helpers.monthsFromString(san_pham_name);
    const days = Helpers.daysFromMonths(months) || 30;

    res.json({
      gia_nhap: basePrice,
      gia_ban: finalPrice,
      so_ngay_da_dang_ki: Number(days),
      het_han: "",
    });
  } catch (error) {
    console.error(`Pricing calculation failed (${id_don_hang}):`, error);
    res.status(500).json({
      error: "Unable to calculate price for the requested product.",
    });
  }
});

app.post("/api/orders", async (req, res) => {
  console.log("[POST] /api/orders");
  const payload = { ...req.body };
  delete payload.id;

  payload.ngay_dang_ki = normalizeDateInput(payload.ngay_dang_ki);
  payload.het_han = normalizeDateInput(payload.het_han);

  const columns = Object.keys(payload);
  if (columns.length === 0) {
    return res.status(400).json({ error: "Order payload is empty." });
  }

  const colList = columns.map((column) => `"${column}"`).join(", ");
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const values = Object.values(payload);

  const q = `
    INSERT INTO mavryk.order_list (${colList})
    VALUES (${placeholders})
    RETURNING *;
  `;

  try {
    const result = await pool.query(q, values);
    if (result.rows.length === 0) {
      return res
        .status(500)
        .json({ error: "Order was not created, database returned no rows." });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Insert failed (POST /api/orders):", error);
    res.status(500).json({
      error: "Unable to create order.",
    });
  }
});

app.get("/api/products/all-prices-by-name/:productName", async (req, res) => {
  const { productName } = req.params;
  console.log(`[GET] /api/products/all-prices-by-name/${productName}`);

  const q = `
    SELECT sp.source_id, sp.price
    FROM mavryk.supply_price sp
    JOIN mavryk.product_price pp ON sp.product_id = pp.id
    WHERE pp.san_pham = $1;
  `;

  try {
    const result = await pool.query(q, [productName]);
    res.json(result.rows);
  } catch (error) {
    console.error(
      "Query failed (GET /api/products/all-prices-by-name/:productName):",
      error
    );
    res.status(500).json({
      error: "Unable to load price list for this product.",
    });
  }
});

app.get("/api/run-scheduler", async (_req, res) => {
  console.log("[GET] /api/run-scheduler");
  try {
    await updateDatabaseTask();
    res.json({ success: true, message: "Cron job executed successfully." });
  } catch (error) {
    console.error("Cron job failed:", error);
    res.status(500).json({ error: "Unable to run scheduled task." });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
