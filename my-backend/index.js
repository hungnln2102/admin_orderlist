require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const { updateDatabaseTask, getSchedulerStatus } = require("./scheduler");
const Helpers = require("./helpers");

const app = express();
const port = Number(process.env.PORT) || 3001;
const DB_SCHEMA = process.env.DB_SCHEMA || "mavryk";

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

const createSourceKey = (column) => `
  LOWER(
    REGEXP_REPLACE(
      TRIM(${column}::text),
      '\\s+',
      ' ',
      'g'
    )
  )
`;

const createVietnameseStatusKey = (column) => `
  LOWER(
    REGEXP_REPLACE(
      TRANSLATE(
        TRIM(${column}::text),
        'ÁÀÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐáàãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
        'AAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOUUUUUUUUUUUUUUUUYYYYYDAaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooouuuuuuuuuuuuuuuuyyyyyda'
      ),
      '\\s+',
      ' ',
      'g'
    )
  )
`;

const createNumericExtraction = (column) => `
  CASE
    WHEN TRIM(${column}::text) ~ '^[-+]?\\d+(\\.\\d+)?$'
      THEN TRIM(${column}::text)::numeric
    ELSE 0
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
const toNullableNumber = (value) => {
    if (value === undefined || value === null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};
const getNextAccountStorageId = async(client) => {
    const result = await client.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM mavryk.account_storage`
    );
    const nextRow =
        result.rows && result.rows.length > 0 ? result.rows[0] : null;
    const nextId = Number(
        nextRow && nextRow.next_id !== undefined ? nextRow.next_id : 1
    );
    return Number.isFinite(nextId) ? nextId : 1;
};

const getNextProductPriceId = async(client) => {
    await client.query("LOCK TABLE mavryk.product_price IN EXCLUSIVE MODE;");
    const result = await client.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM mavryk.product_price;`
    );
    const nextRow =
        result.rows && result.rows.length > 0 ? result.rows[0] : null;
    const nextId = Number(
        nextRow && nextRow.next_id !== undefined ? nextRow.next_id : 1
    );
    return Number.isFinite(nextId) ? nextId : 1;
};

const getNextSupplyId = async(client) => {
    await client.query("LOCK TABLE mavryk.supply IN EXCLUSIVE MODE;");
    const result = await client.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM mavryk.supply;`
    );
    const nextRow =
        result.rows && result.rows.length > 0 ? result.rows[0] : null;
    const nextId = Number(
        nextRow && nextRow.next_id !== undefined ? nextRow.next_id : 1
    );
    return Number.isFinite(nextId) ? nextId : 1;
};

const getNextSupplyPriceId = async(client) => {
    await client.query("LOCK TABLE mavryk.supply_price IN EXCLUSIVE MODE;");
    const result = await client.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM mavryk.supply_price;`
    );
    const nextRow =
        result.rows && result.rows.length > 0 ? result.rows[0] : null;
    const nextId = Number(
        nextRow && nextRow.next_id !== undefined ? nextRow.next_id : 1
    );
    return Number.isFinite(nextId) ? nextId : 1;
};

const ensureSupplyRecord = async(client, sourceName) => {
    const existingId = await findSupplyIdByName(client, sourceName);
    if (existingId) {
        return existingId;
    }
    const nextSupplyId = await getNextSupplyId(client);
    const statusColumn = await resolveSupplyStatusColumn();
    const fields = ["id", "source_name"];
    const values = [nextSupplyId, sourceName];
    if (statusColumn) {
        fields.push(`"${statusColumn}"`);
        values.push("active");
    }
    const placeholders = values.map((_, idx) => `$${idx + 1}`);
    const insertResult = await client.query(
        `
    INSERT INTO mavryk.supply (${fields.join(", ")})
    VALUES (${placeholders.join(", ")})
    RETURNING id;
  `,
        values
    );
    const newId = insertResult.rows?.[0]?.id ?? nextSupplyId;
    if (!newId) {
        throw new Error("Không thể tạo nhà cung cấp mới.");
    }
    return newId;
};
const fromDbNumber = (value) => {
    if (value === undefined || value === null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};
const parseDbBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (value === undefined || value === null) return false;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return false;
    return ["true", "1", "t", "y", "yes"].includes(normalized);
};
const formatDateOutput = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        let match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        }
        match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
            return `${match[3]}-${match[2]}-${match[1]}`;
        }
        return trimmed;
    }
    const dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) return null;
    const year = dateValue.getUTCFullYear();
    const month = String(dateValue.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const summarizePackageInformation = (user, pass, mail) => {
    return (
        [
            user && `User: ${user}`,
            pass && `Pass: ${pass}`,
            mail && `Mail 2nd: ${mail}`,
        ]
        .filter(Boolean)
        .join(" | ") || null
    );
};
const getRowId = (row, ...keys) => {
    if (!row) return null;
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) {
            const value = Number(row[key]);
            if (Number.isFinite(value)) return value;
        }
    }
    return null;
};
const hasMeaningfulValue = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
};
const hasAccountStoragePayload = (payload = {}) => {
    const {
        accountUser,
        accountPass,
        accountMail,
        accountNote,
        capacity,
    } = payload;
    if (
        hasMeaningfulValue(accountUser) ||
        hasMeaningfulValue(accountPass) ||
        hasMeaningfulValue(accountMail) ||
        hasMeaningfulValue(accountNote)
    ) {
        return true;
    }
    if (capacity !== undefined && capacity !== null && capacity !== "") {
        return true;
    }
    return false;
};

const normalizeSupplyStatus = (value) => {
    if (value === undefined || value === null) return "active";
    const normalized = String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    if (!normalized) return "active";
    if (
        [
            "active",
            "dang hoat dong",
            "dang hoat dong",
            "hoat dong",
            "running",
        ].includes(normalized)
    ) {
        return "active";
    }
    if (
        [
            "inactive",
            "tam ngung",
            "tam dung",
            "tam dung",
            "pause",
            "paused",
        ].includes(normalized)
    ) {
        return "inactive";
    }
    return normalized;
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

const SUPPLY_STATUS_CANDIDATES = ["status", "trang_thai", "is_active"];
let supplyStatusColumnNameCache = null;
let supplyStatusColumnResolved = false;

const resolveSupplyStatusColumn = async() => {
    if (supplyStatusColumnResolved) {
        return supplyStatusColumnNameCache;
    }
    const client = await pool.connect();
    try {
        const detectionQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'mavryk'
        AND table_name = 'supply'
        AND column_name = ANY($1::text[])
      ORDER BY CASE column_name
        WHEN 'status' THEN 1
        WHEN 'trang_thai' THEN 2
        WHEN 'is_active' THEN 3
        ELSE 4 END
      LIMIT 1;
    `;
        const result = await client.query(detectionQuery, [SUPPLY_STATUS_CANDIDATES]);
        supplyStatusColumnNameCache = result.rows?.[0]?.column_name || null;
    } catch (error) {
        console.warn("Unable to detect supply status column:", error.message || error);
        supplyStatusColumnNameCache = null;
    } finally {
        supplyStatusColumnResolved = true;
        client.release();
    }
    return supplyStatusColumnNameCache;
};

const PACKAGE_PRODUCTS_SELECT = `
  SELECT
    pp.id AS package_id,
    pp.package AS package_name,
    pp.username AS package_username,
    pp.password AS package_password,
    pp."mail 2nd" AS package_mail_2nd,
    pp.note AS package_note,
    pp.supplier AS package_supplier,
    pp."Import" AS package_import,
    pp.slot AS package_slot,
    pp.expired AS package_expired,
    pp.expired::text AS package_expired_raw,
    pp.match AS package_match,
    acc.id AS account_id,
    acc.username AS account_username,
    acc.password AS account_password,
    acc."Mail 2nd" AS account_mail_2nd,
    acc.note AS account_note,
    acc.storage AS account_storage,
    acc."Mail Family" AS account_mail_family,
    COALESCE(product_codes.product_codes, ARRAY[]::text[]) AS package_products
  FROM mavryk.package_product pp
  LEFT JOIN mavryk.account_storage acc
    ON acc."Mail Family" = pp.username
  LEFT JOIN (
    SELECT
      LOWER(TRIM(package::text)) AS package_key,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(TRIM(san_pham::text), '')), NULL) AS product_codes
    FROM mavryk.product_price
    GROUP BY LOWER(TRIM(package::text))
  ) product_codes ON product_codes.package_key = LOWER(TRIM(pp.package::text))
`;
const mapPackageProductRow = (row) => {
    const packageId = getRowId(row, "package_id", "id", "ID");
    const informationUser = row.package_username ?? null;
    const informationPass = row.package_password ?? null;
    const informationMail = row.package_mail_2nd ?? null;
    const informationSummary = summarizePackageInformation(
        informationUser,
        informationPass,
        informationMail
    );
    const accountStorageId = getRowId(row, "account_id", "account_storage_id");
    const productCodes = Array.isArray(row.package_products) ?
        row.package_products
        .map((code) => (typeof code === "string" ? code.trim() : ""))
        .filter((code) => Boolean(code)) : [];
    return {
        id: packageId,
        package: row.package_name || "",
        information: informationSummary,
        informationUser,
        informationPass,
        informationMail,
        note: row.package_note ?? null,
        supplier: row.package_supplier ?? null,
        import: fromDbNumber(row.package_import),
        accountStorageId,
        accountUser: row.account_username ?? null,
        accountPass: row.account_password ?? null,
    accountMail: row.account_mail_2nd ?? null,
    accountNote: row.account_note ?? null,
    capacity: fromDbNumber(row.account_storage),
    expired: formatDateOutput(row.package_expired_raw ?? row.package_expired),
    slot: fromDbNumber(row.package_slot),
    slotUsed: null,
    capacityUsed: null,
    match: row.package_match ?? null,
    productCodes,
    hasCapacityField: row.account_storage !== null && row.account_storage !== undefined,
  };
};
const fetchPackageProductById = async(client, id) => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    const result = await client.query(
        `${PACKAGE_PRODUCTS_SELECT} WHERE pp.id = $1`, [numericId]
    );
    if (!result.rows.length) return null;
    return mapPackageProductRow(result.rows[0]);
};

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const timezoneCandidate =
    typeof process.env.APP_TIMEZONE === "string" &&
    /^[A-Za-z0-9_\/+-]+$/.test(process.env.APP_TIMEZONE) ?
    process.env.APP_TIMEZONE :
    DEFAULT_TIMEZONE;
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
    FROM ${DB_SCHEMA}.order_list
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

app.get("/api/dashboard/stats", async(_req, res) => {
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

app.get("/api/dashboard/years", async(_req, res) => {
    console.log("[GET] /api/dashboard/years");
    const q = `
    WITH all_dates AS (
      SELECT ngay_dang_ki::text AS raw_date FROM ${DB_SCHEMA}.order_list
      UNION ALL
      SELECT ngay_dang_ki::text AS raw_date FROM ${DB_SCHEMA}.order_expired
      UNION ALL
      SELECT ngay_dang_ki::text AS raw_date FROM ${DB_SCHEMA}.order_canceled
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

app.get("/api/dashboard/charts", async(req, res) => {
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
      FROM mavryk.order_expired
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

// Helpers to normalize raw date strings and compute days without timezone drift
const normalizeRawToYMD = (raw) => {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    // YYYY/MM/DD
    m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    // DD/MM/YYYY
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    // DD-MM-YYYY
    m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    // YYYYMMDD
    m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return null;
};

const todayYMDInVietnam = () => {
    // Vietnam time is UTC+7, no DST
    const now = Date.now();
    const vnMs = now + 7 * 60 * 60 * 1000;
    const d = new Date(vnMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const formatDateYMD = (date) => {
    if (!(date instanceof Date)) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const getCurrentMonthRange = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
        monthStart: formatDateYMD(monthStart),
        nextMonthStart: formatDateYMD(nextMonthStart),
    };
};

const diffDaysYMD = (fromYmd, toYmd) => {
    if (!fromYmd || !toYmd) return null;
    const [fy, fm, fd] = fromYmd.split("-").map(Number);
    const [ty, tm, td] = toYmd.split("-").map(Number);
    const fromMs = Date.UTC(fy, fm - 1, fd);
    const toMs = Date.UTC(ty, tm - 1, td);
    return Math.floor((fromMs - toMs) / (24 * 60 * 60 * 1000));
};

const formatYMDToDMY = (value) => {
    if (!value) return "";
    const str = String(value).trim();
    if (!str) return "";
    let match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }
    match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }
    match = str.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return "";
};

const roundToNearestThousand = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric % 1000 === 0) {
        // Nếu đã tròn nghìn thì giữ nguyên (tránh làm tròn lại)
        return Math.max(0, numeric);
    }
    return Math.max(0, Math.round(numeric / 1000) * 1000);
};

const normalizeTextInput = (value) => {
    if (value === undefined || value === null) return "";
    return String(value).trim();
};

const normalizeMultiplier = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1.0;
};

const computeRoundedPriceFromSupply = (basePrice, pctCtv, pctKhach, isWholesale) => {
    if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
    let price = basePrice * normalizeMultiplier(pctCtv);
    if (!isWholesale) {
        price *= normalizeMultiplier(pctKhach);
    }
    return roundToNearestThousand(
        Helpers.roundGiaBanValue(Math.max(0, price))
    );
};

const computePromoPriceFromSupply = (
    basePrice,
    pctCtv,
    pctKhach,
    pctPromo
) => {
    if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
    const wholesalePrice = basePrice * normalizeMultiplier(pctCtv);
    if (!Number.isFinite(wholesalePrice) || wholesalePrice <= 0) return 0;
    const khachRatio = normalizeMultiplier(pctKhach);
    const promoRatio =
        Number.isFinite(Number(pctPromo)) && Number(pctPromo) >= 0 ?
        Number(pctPromo) :
        0;
    const effectiveRatio = Math.max(0, khachRatio - promoRatio);
    if (effectiveRatio <= 0) return 0;
    return roundToNearestThousand(
        Helpers.roundGiaBanValue(Math.max(0, wholesalePrice * effectiveRatio))
    );
};

const mapDbProductPriceRow = (row) => {
    if (!row) return null;
    const baseSupplyPrice = Number(row.max_supply_price) || 0;
    const pctCtv = fromDbNumber(row.pct_ctv);
    const pctKhach = fromDbNumber(row.pct_khach);
    const pctPromo = fromDbNumber(row.pct_promo);
    const computedWholesalePrice = computeRoundedPriceFromSupply(
        baseSupplyPrice,
        pctCtv,
        pctKhach,
        true
    );
    const computedRetailPrice = computeRoundedPriceFromSupply(
        baseSupplyPrice,
        pctCtv,
        pctKhach,
        false
    );
    const computedPromoPrice = computePromoPriceFromSupply(
        baseSupplyPrice,
        pctCtv,
        pctKhach,
        pctPromo
    );

    return {
        id: row.id,
        package: (row.package_label || "").trim(),
        package_product: (row.package_product_label || "").trim(),
        san_pham: (row.san_pham_label || "").trim(),
        pct_ctv: pctCtv,
        pct_khach: pctKhach,
        pct_promo: pctPromo,
        is_active: parseDbBoolean(row.is_active),
        update: row.update instanceof Date ?
            row.update.toISOString() : row.update,
        computed_wholesale_price: computedWholesalePrice,
        computed_retail_price: computedRetailPrice,
        computed_promo_price: computedPromoPrice,
        promo_price: computedPromoPrice,
        max_supply_price: baseSupplyPrice,
    };
};

const mapPostgresErrorToMessage = (error) => {
    if (!error) return null;
    switch (error.code) {
        case "23505":
            return "MÃ£ Sáº£n Pháº©m ÄÃ£ Tá»“n Táº¡i, Vui LÃ²ng Chá»n MÃ£ Sáº£n Pháº©m KhÃ¡c";
        case "22P02":
            return "Tá»· Lá»‡ GiÃ¡ Pháº£i LÃ  Sá»‘ Há»£p Lá»‡";
        case "23503":
            return "KhÃ´ng thá»ƒ cáº­p nháº­t sáº£n pháº©m do dá»¯ liá»‡u liÃªn quan khÃ´ng há»£p lá»‡.";
        default:
            return null;
    }
};

const fetchProductPriceRowById = async(client, productId) => {
    const reloadQuery = `
    WITH supply AS (
      SELECT product_id, MAX(price) AS max_supply_price
      FROM mavryk.supply_price
      GROUP BY product_id
    )
    SELECT
      pp.id,
      COALESCE(pp.package::text, '') AS package_label,
      COALESCE(pp.package_product::text, '') AS package_product_label,
      COALESCE(pp.san_pham::text, '') AS san_pham_label,
      pp.pct_ctv,
      pp.pct_khach,
      pp.pct_promo,
      pp.is_active,
      pp.update,
      COALESCE(supply.max_supply_price, 0) AS max_supply_price
    FROM mavryk.product_price pp
    LEFT JOIN supply ON supply.product_id = pp.id
    WHERE pp.id = $1
    LIMIT 1;
  `;
    const reloadResult = await client.query(reloadQuery, [productId]);
    if (!reloadResult.rows.length) {
        return null;
    }
    return mapDbProductPriceRow(reloadResult.rows[0]);
};

const findSupplyIdByName = async(client, sourceName) => {
    if (!sourceName) return null;
    const normalized = sourceName.trim().toLowerCase();
    if (!normalized) return null;
    const result = await client.query(
        `
    SELECT id
    FROM mavryk.supply
    WHERE LOWER(TRIM(source_name::text)) = $1
    ORDER BY id ASC
    LIMIT 1;
  `, [normalized]
    );
    return result.rows?.[0]?.id ?? null;
};

const normalizeCheckFlagValue = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (value === 1) return true;
        if (value === 0) return false;
        return null;
    }
    if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        if (["true", "t", "1", "yes"].includes(lowered)) return true;
        if (["false", "f", "0", "no"].includes(lowered)) return false;
        if (lowered === "null" || lowered === "undefined" || lowered === "") {
            return null;
        }
    }
    return null;
};

const normalizeOrderRow = (row, todayYmd = todayYMDInVietnam()) => {
    const registrationRaw = row.ngay_dang_ki_raw ?? row.ngay_dang_ki;
    const expiryRaw = row.het_han_raw ?? row.het_han;

    const registrationYmd = normalizeRawToYMD(registrationRaw);
    const expiryYmd = normalizeRawToYMD(expiryRaw);
    const remainingDays =
        expiryYmd && todayYmd ? diffDaysYMD(expiryYmd, todayYmd) : null;
    const backendRemaining =
        row.so_ngay_con_lai !== undefined && row.so_ngay_con_lai !== null ?
        Number(row.so_ngay_con_lai) :
        null;
    const soNgayConLai =
        Number.isFinite(remainingDays) && remainingDays !== null ?
        remainingDays :
        Number.isFinite(backendRemaining) ?
        backendRemaining :
        null;

    const dbStatusRaw =
        typeof row.tinh_trang === "string" ? row.tinh_trang.trim() : "";
    let autoStatus = dbStatusRaw || "Chưa Thanh Toán";
    let autoCheckFlag = normalizeCheckFlagValue(row.check_flag);

    if (autoStatus !== "Đã Thanh Toán") {
        if (Number.isFinite(soNgayConLai)) {
            if (soNgayConLai <= 0) {
                autoStatus = "Hết Hạn";
                autoCheckFlag = null;
            } else if (soNgayConLai > 0 && soNgayConLai <= 4) {
                autoStatus = "Cần Gia Hạn";
                autoCheckFlag = null;
            }
        }
    }

    if (autoStatus === "Đã Thanh Toán" && autoCheckFlag === null) {
        autoCheckFlag = true;
    }

    const finalStatus = dbStatusRaw || autoStatus;
    const dbCheckFlag = normalizeCheckFlagValue(row.check_flag);
    const finalCheckFlag =
        dbCheckFlag !== null ? dbCheckFlag : (autoCheckFlag ?? null);

    const registrationDisplay = formatYMDToDMY(registrationYmd);
    const expiryDisplay = formatYMDToDMY(expiryYmd);

    return {
        ...row,
        registration_date: registrationYmd,
        expiry_date: expiryYmd,
        registration_date_str: registrationDisplay,
        expiry_date_str: expiryDisplay,
        registration_date_display: registrationDisplay,
        expiry_date_display: expiryDisplay,
        so_ngay_con_lai: Number.isFinite(soNgayConLai) ? soNgayConLai : null,
        tinh_trang: finalStatus,
        tinh_trang_auto: autoStatus,
        check_flag: finalCheckFlag,
        check_flag_auto: autoCheckFlag,
    };
};

const ORDER_WRITABLE_COLUMNS = new Set([
    "id_don_hang",
    "san_pham",
    "thong_tin_san_pham",
    "khach_hang",
    "link_lien_he",
    "slot",
    "ngay_dang_ki",
    "so_ngay_da_dang_ki",
    "het_han",
    "nguon",
    "gia_nhap",
    "gia_ban",
    "note",
    "tinh_trang",
    "check_flag",
]);

const sanitizeOrderWritePayload = (raw = {}) => {
    const sanitized = {};
    Object.entries(raw || {}).forEach(([key, value]) => {
        if (!ORDER_WRITABLE_COLUMNS.has(key)) {
            return;
        }

        let normalizedValue = value;
        if (key === "ngay_dang_ki" || key === "het_han") {
            normalizedValue = normalizeDateInput(value);
        } else if (key === "gia_nhap" || key === "gia_ban") {
            normalizedValue =
                value === undefined || value === null || value === "" ?
                null :
                toNullableNumber(value);
        } else if (key === "so_ngay_da_dang_ki") {
            if (value === undefined || value === null || String(value).trim() === "") {
                normalizedValue = null;
            } else {
                const parsedDays = Number(value);
                normalizedValue = Number.isFinite(parsedDays) ? parsedDays : value;
            }
        } else if (key === "check_flag") {
            normalizedValue = normalizeCheckFlagValue(value);
        } else if (typeof value === "string") {
            normalizedValue = value.trim();
        }

        sanitized[key] = normalizedValue;
    });

    return sanitized;
};
const ARCHIVE_COLUMNS_COMMON = [
    "id",
    "id_don_hang",
    "san_pham",
    "thong_tin_san_pham",
    "khach_hang",
    "link_lien_he",
    "slot",
    "ngay_dang_ki",
    "so_ngay_da_dang_ki",
    "het_han",
    "nguon",
    "gia_nhap",
    "gia_ban",
];
const ARCHIVE_COLUMNS_EXPIRED = [
    ...ARCHIVE_COLUMNS_COMMON,
    "note",
    "tinh_trang",
    "check_flag",
    "archived_at",
];
const ARCHIVE_COLUMNS_CANCELED = [
    ...ARCHIVE_COLUMNS_COMMON,
    "can_hoan",
    "tinh_trang",
    "check_flag",
];

const buildArchiveInsert = (tableName, columns, row, overrides = {}) => {
  const columnList = columns.map((col) => `"${col}"`).join(", ");
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
  const values = columns.map((col) => {
    if (Object.prototype.hasOwnProperty.call(overrides, col)) {
      return overrides[col];
    }
    return row[col] ?? null;
  });
  const sql = `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`;
  return { sql, values };
};

const fetchOrdersFromTable = async (tableName) => {
  const query = `
    SELECT *,
           ngay_dang_ki::text AS ngay_dang_ki_raw,
           het_han::text      AS het_han_raw
    FROM ${tableName};
  `;
  const result = await pool.query(query);
  const todayYmd = todayYMDInVietnam();
  return result.rows.map((row) => normalizeOrderRow(row, todayYmd));
};
app.get("/api/orders", async (req, res) => {
  console.log("[GET] /api/orders");
  const scope = String(req.query.scope || "").trim().toLowerCase();

  const table =
    scope === "expired"
      ? "mavryk.order_expired"
      : scope === "canceled" || scope === "cancelled"
      ? "mavryk.order_canceled"
      : "mavryk.order_list";

  try {
    const rows = await fetchOrdersFromTable(table);
    res.json(rows);
  } catch (error) {
    console.error("Query failed (GET /api/orders):", error);
    res.status(500).json({
      error: "Unable to load order list.",
    });
  }
});

app.get("/api/orders/expired", async (_req, res) => {
  console.log("[GET] /api/orders/expired");
  try {
    const rows = await fetchOrdersFromTable("mavryk.order_expired");
    res.json(rows);
  } catch (error) {
    console.error("Query failed (GET /api/orders/expired):", error);
    res.status(500).json({
      error: "Unable to load expired orders.",
    });
  }
});

app.get("/api/orders/canceled", async (_req, res) => {
  console.log("[GET] /api/orders/canceled");
  try {
    const rows = await fetchOrdersFromTable("mavryk.order_canceled");
    res.json(rows);
  } catch (error) {
    console.error("Query failed (GET /api/orders/canceled):", error);
    res.status(500).json({
      error: "Unable to load canceled orders.",
    });
  }
});

app.patch("/api/orders/canceled/:id/refund", async (req, res) => {
  const { id } = req.params;
  console.log(`[PATCH] /api/orders/canceled/${id}/refund`);

  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "Invalid canceled order id." });
  }

  try {
    const result = await pool.query(
      `
        UPDATE mavryk.order_canceled
        SET tinh_trang = 'Da Hoan',
            check_flag = FALSE
        WHERE id = $1
        RETURNING id, id_don_hang;
      `,
      [parsedId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Canceled order not found." });
    }

    res.json({
      success: true,
      id: parsedId,
      id_don_hang: result.rows[0].id_don_hang,
      status: "Da Hoan",
      check_flag: false,
    });
  } catch (error) {
    console.error(`[PATCH] /api/orders/canceled/${id}/refund failed:`, error);
    res.status(500).json({ error: "Unable to mark order as refunded." });
  }
});

// New endpoint: Purchase Orders (table mavryk.purchase_order)


app.get("/api/supply-insights", async(_req, res) => {
    console.log("[GET] /api/supply-insights");
    const { monthStart, nextMonthStart } = getCurrentMonthRange();
    const orderDateCase = createDateNormalization("ngay_dang_ki");
    const sourceKeyCase = createSourceKey("nguon");
    const giaNhapCase = createNumericExtraction("gia_nhap");
    const supplySourceKey = createSourceKey("s.source_name");
    const statusColumnName = await resolveSupplyStatusColumn();
    const paymentStatusKey = createVietnameseStatusKey("ps.status");
    const statusSelect = statusColumnName ?
        `s."${statusColumnName}"::text AS raw_status` :
        "NULL AS raw_status";
    const query = `
    WITH orders_union AS (
      SELECT
        ${orderDateCase} AS order_date,
        COALESCE(${sourceKeyCase}, '') AS source_key,
        TRIM(nguon::text) AS source_name,
        ${giaNhapCase} AS import_value
      FROM mavryk.order_list
      WHERE TRIM(nguon::text) <> ''
      UNION ALL
      SELECT
        ${orderDateCase} AS order_date,
        COALESCE(${sourceKeyCase}, '') AS source_key,
        TRIM(nguon::text) AS source_name,
        ${giaNhapCase} AS import_value
      FROM mavryk.order_expired
      WHERE TRIM(nguon::text) <> ''
      UNION ALL
      SELECT
        ${orderDateCase} AS order_date,
        COALESCE(${sourceKeyCase}, '') AS source_key,
        TRIM(nguon::text) AS source_name,
        ${giaNhapCase} AS import_value
      FROM mavryk.order_canceled
      WHERE TRIM(nguon::text) <> ''
    ),
    orders_filtered AS (
      SELECT *
      FROM orders_union
      WHERE order_date IS NOT NULL
        AND source_key <> ''
    ),
    month_data AS (
      SELECT
        source_key,
        COUNT(*) AS monthly_orders,
        COALESCE(SUM(import_value), 0) AS monthly_import_value
      FROM orders_filtered
      WHERE order_date >= $1::date
        AND order_date < $2::date
      GROUP BY source_key
    ),
    last_order AS (
      SELECT
        source_key,
        MAX(order_date) AS last_order_date
      FROM orders_filtered
      GROUP BY source_key
    ),
    total_data AS (
      SELECT
        source_key,
        COUNT(*) AS total_orders
      FROM orders_filtered
      GROUP BY source_key
    ),
    product_data AS (
      SELECT
        sp.source_id,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(TRIM(pp.san_pham::text), '')), NULL) AS product_list
      FROM mavryk.supply_price sp
      JOIN mavryk.product_price pp ON sp.product_id = pp.id
      GROUP BY sp.source_id
    ),
    payment_summary AS (
      SELECT
        ps.source_id,
        SUM(
          CASE
            WHEN ${paymentStatusKey} = 'da thanh toan'
              THEN COALESCE(ps.import, 0)
            ELSE 0
          END
        ) AS total_paid_import,
        SUM(
          CASE
            WHEN ${paymentStatusKey} = 'chua thanh toan'
              THEN COALESCE(ps.import, 0)
            ELSE 0
          END
        ) AS total_unpaid_import
      FROM mavryk.payment_supply ps
      GROUP BY ps.source_id
    )
    SELECT
      s.id,
      s.source_name,
      s.number_bank,
      s.bin_bank,
      ${statusSelect},
      COALESCE(s.active_supply, TRUE) AS active_supply,
      COALESCE(bl.bank_name, '') AS bank_name,
      COALESCE(product_data.product_list, ARRAY[]::text[]) AS product_names,
      COALESCE(month_data.monthly_orders, 0) AS monthly_orders,
      COALESCE(month_data.monthly_import_value, 0) AS monthly_import_value,
      COALESCE(last_order.last_order_date, NULL) AS last_order_date,
      COALESCE(total_data.total_orders, 0) AS total_orders,
      COALESCE(payment_summary.total_paid_import, 0) AS total_paid_import,
      COALESCE(payment_summary.total_unpaid_import, 0) AS total_unpaid_import
    FROM mavryk.supply s
    LEFT JOIN product_data ON product_data.source_id = s.id
    LEFT JOIN month_data
      ON month_data.source_key = ${supplySourceKey}
    LEFT JOIN last_order
      ON last_order.source_key = ${supplySourceKey}
    LEFT JOIN total_data
      ON total_data.source_key = ${supplySourceKey}
    LEFT JOIN payment_summary
      ON payment_summary.source_id = s.id
    LEFT JOIN mavryk.bank_list bl
      ON TRIM(bl.bin::text) = TRIM(s.bin_bank::text)
    ORDER BY s.source_name;
  `;
    try {
        const result = await pool.query(query, [monthStart, nextMonthStart]);
        const rows = result.rows || [];
        const supplies = rows.map((row) => {
            const normalizedStatus = normalizeSupplyStatus(row.raw_status);
            const isActive = row.active_supply === true;
            return {
                id: row.id,
                sourceName: row.source_name || "",
                numberBank: row.number_bank || null,
                binBank: row.bin_bank || null,
                bankName: row.bank_name || null,
                status: isActive ? "active" : normalizedStatus || "inactive",
                rawStatus: row.raw_status || null,
                isActive,
                products: Array.isArray(row.product_names) ? row.product_names : [],
                monthlyOrders: Number(row.monthly_orders) || 0,
                monthlyImportValue: Number(row.monthly_import_value) || 0,
                lastOrderDate: formatDateOutput(row.last_order_date),
                totalOrders: Number(row.total_orders) || 0,
                totalPaidImport: Number(row.total_paid_import) || 0,
                totalUnpaidImport: Number(row.total_unpaid_import) || 0,
            };
        });
        const stats = supplies.reduce(
            (acc, supply) => {
                acc.totalSuppliers += 1;
                if (supply.isActive) {
                    acc.activeSuppliers += 1;
                }
                acc.monthlyOrders += supply.monthlyOrders;
                acc.totalImportValue += supply.monthlyImportValue;
                return acc;
            }, {
                totalSuppliers: 0,
                activeSuppliers: 0,
                monthlyOrders: 0,
                totalImportValue: 0,
            }
        );
        res.json({ stats, supplies });
    } catch (error) {
        console.error("Query failed (GET /api/supply-insights):", error);
        res.status(500).json({
            error: "Unable to load supply insights.",
        });
    }
});

app.get("/api/supplies", async(_req, res) => {
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

app.get("/api/supplies/:supplyId/products", async(req, res) => {
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

app.get("/api/supplies/:supplyId/payments", async(req, res) => {
    const { supplyId } = req.params;
    console.log(`[GET] /api/supplies/${supplyId}/payments`, req.query);

    const parsedSupplyId = Number.parseInt(supplyId, 10);
    if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
        return res.status(400).json({
            error: "Invalid supply id.",
        });
    }

    const limitParam = Number.parseInt(req.query.limit, 10);
    const offsetParam = Number.parseInt(req.query.offset, 10);
    const limit = Number.isFinite(limitParam) ?
        Math.min(Math.max(limitParam, 1), 50) :
        5;
    const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;
    const limitPlusOne = limit + 1;
    const q = `
    SELECT
      ps.id,
      ps.source_id,
      COALESCE(s.source_name, '') AS source_name,
      COALESCE(ps.import, 0) AS import_value,
      COALESCE(ps.paid, 0) AS paid_value,
      COALESCE(ps.round, '') AS round_label,
      COALESCE(ps.status, '') AS status_label
    FROM mavryk.payment_supply ps
    LEFT JOIN mavryk.supply s ON s.id = ps.source_id
    WHERE ps.source_id = $1
    ORDER BY ps.id DESC
    OFFSET $2
    LIMIT $3;
  `;

    try {
        const result = await pool.query(q, [parsedSupplyId, offset, limitPlusOne]);
        const rows = result.rows || [];
        const hasMore = rows.length > limit;
        const payments = rows.slice(0, limit).map((row) => ({
            id: row.id,
            sourceId: row.source_id,
            sourceName: row.source_name,
            totalImport: Number(row.import_value) || 0,
            paid: Number(row.paid_value) || 0,
            round: row.round_label || "",
            status: row.status_label || "",
        }));

        res.json({
            payments,
            hasMore,
            nextOffset: offset + payments.length,
        });
    } catch (error) {
        console.error("Query failed (GET /api/supplies/:id/payments):", error);
        res.status(500).json({
            error: "Unable to load payment history for this supplier.",
        });
    }
});

app.post("/api/supplies/:supplyId/payments", async(req, res) => {
    const { supplyId } = req.params;
    console.log(`[POST] /api/supplies/${supplyId}/payments`, req.body);

    const parsedSupplyId = Number.parseInt(supplyId, 10);
    if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
        return res.status(400).json({
            error: "Invalid supply id.",
        });
    }

    const parseMoney = (value, fallback = 0) => {
        if (value === null || value === undefined) return fallback;
        if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
            return value;
        }
        const cleaned = String(value).replace(/[^0-9]/g, "");
        if (!cleaned) return fallback;
        const num = Number(cleaned);
        return Number.isFinite(num) && num >= 0 ? num : fallback;
    };

    const roundLabel =
        (typeof req.body?.round === "string" && req.body.round.trim()) ||
        "Chu kỳ mới";
    const totalImport = parseMoney(req.body?.totalImport, 0);
    const paid = parseMoney(req.body?.paid, 0);
    const statusLabel =
        (typeof req.body?.status === "string" && req.body.status.trim()) ||
        "Chưa Thanh Toán";

    try {
        const insertQuery = `
      INSERT INTO mavryk.payment_supply (source_id, import, paid, round, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, source_id, import, paid, round, status;
    `;
        const result = await pool.query(insertQuery, [
            parsedSupplyId,
            totalImport,
            paid,
            roundLabel,
            statusLabel,
        ]);
        if (!result.rows.length) {
            return res.status(500).json({
                error: "Failed to insert payment cycle.",
            });
        }
        const row = result.rows[0];
        res.status(201).json({
            id: row.id,
            sourceId: row.source_id,
            totalImport: Number(row.import) || 0,
            paid: Number(row.paid) || 0,
            round: row.round || "",
            status: row.status || "",
        });
    } catch (error) {
        console.error(
            `Mutation failed (POST /api/supplies/${supplyId}/payments):`,
            error
        );
        res.status(500).json({
            error: "Unable to create payment cycle.",
        });
    }
});

app.get("/api/payment-receipts", async(req, res) => {
    console.log("[GET] /api/payment-receipts", req.query);
    const limitParam = Number.parseInt(req.query.limit, 10);
    const offsetParam = Number.parseInt(req.query.offset, 10);
    const limit = Number.isFinite(limitParam) ?
        Math.min(Math.max(limitParam, 1), 500) :
        200;
    const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

    const query = `
    SELECT
      id,
      COALESCE(ma_don_hang::text, '') AS ma_don_hang,
      COALESCE(ngay_thanh_toan::text, '') AS ngay_thanh_toan,
      COALESCE(so_tien, 0) AS so_tien,
      COALESCE(nguoi_gui::text, '') AS nguoi_gui,
      COALESCE(noi_dung_ck::text, '') AS noi_dung_ck
    FROM mavryk.payment_receipt
    ORDER BY
      NULLIF(ngay_thanh_toan::text, '') DESC NULLS LAST,
      id DESC
    OFFSET $1
    LIMIT $2;
  `;

    try {
        const result = await pool.query(query, [offset, limit]);
        const rows = result.rows || [];
        const receipts = rows.map((row) => ({
            id: row.id,
            orderCode: row.ma_don_hang,
            paidAt: row.ngay_thanh_toan,
            amount: Number(row.so_tien) || 0,
            sender: row.nguoi_gui,
            note: row.noi_dung_ck,
        }));
        res.json({ receipts, count: receipts.length, offset, limit });
    } catch (error) {
        console.error("Query failed (GET /api/payment-receipts):", error);
        res.status(500).json({
            error: "Unable to load payment receipts.",
        });
    }
});

app.get("/api/products", async(_req, res) => {
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

app.get("/api/product-prices", async(_req, res) => {
    console.log("[GET] /api/product-prices");
    const query = `
    WITH base AS (
      SELECT
        pp.id,
        COALESCE(pp.package::text, '') AS package_label,
        COALESCE(pp.package_product::text, '') AS package_product_label,
        COALESCE(pp.san_pham::text, '') AS san_pham_label,
        pp.pct_ctv,
        pp.pct_khach,
        pp.pct_promo,
        pp.is_active,
        pp.update
      FROM mavryk.product_price pp
    ),
    supply AS (
      SELECT product_id, MAX(price) AS max_supply_price
      FROM mavryk.supply_price
      GROUP BY product_id
    )
    SELECT
      base.*,
      COALESCE(supply.max_supply_price, 0) AS max_supply_price
    FROM base
    LEFT JOIN supply ON supply.product_id = base.id
    ORDER BY
      base.package_label ASC,
      base.package_product_label ASC,
      base.san_pham_label ASC;
  `;

    try {
        const result = await pool.query(query);
        const rows = result.rows || [];
        const items = rows
            .map(mapDbProductPriceRow)
            .filter((row) => row !== null);
        res.json({
            items,
            count: items.length,
        });
    } catch (error) {
        console.error("Query failed (GET /api/product-prices):", error);
        res.status(500).json({
            error: "Unable to load product pricing data.",
        });
    }
});

app.post("/api/product-prices", async(req, res) => {
    console.log("[POST] /api/product-prices", req.body);
    const {
        packageName,
        packageProduct,
        sanPham,
        pctCtv,
        pctKhach,
        pctPromo,
        suppliers,
    } = req.body || {};

    const normalizedPackageName = normalizeTextInput(packageName) || null;
    const normalizedPackageProduct = normalizeTextInput(packageProduct) || null;
    const normalizedSanPham = normalizeTextInput(sanPham);
    const pctCtvValue = toNullableNumber(pctCtv);
    const pctKhachValue = toNullableNumber(pctKhach);
    const pctPromoValue = toNullableNumber(pctPromo);
    const supplierEntries = Array.isArray(suppliers) ? suppliers : [];

    if (!normalizedSanPham) {
        return res
            .status(400)
            .json({ error: "Ma san pham khong duoc de trong." });
    }
    if (!pctCtvValue || pctCtvValue <= 0) {
        return res
            .status(400)
            .json({ error: "Ty gia CTV phai lon hon 0." });
    }
    if (!pctKhachValue || pctKhachValue <= 0) {
        return res
            .status(400)
            .json({ error: "Ty gia Khach phai lon hon 0." });
    }
    if (pctPromoValue !== null) {
        if (pctPromoValue < 0) {
            return res
                .status(400)
                .json({ error: "Ty gia khuyen mai phai lon hon hoac bang 0." });
        }
        if (pctPromoValue >= pctKhachValue) {
            return res.status(400).json({
                error: "Ty gia khuyen mai phai nho hon ty gia khach.",
            });
        }
        if (pctKhachValue - pctPromoValue > 1) {
            return res.status(400).json({
                error: "Gia khuyen mai khong duoc vuot gia si.",
            });
        }
    }
    if (supplierEntries.length === 0) {
        return res.status(400).json({
            error: "Can them it nhat mot nha cung cap.",
        });
    }

    const todayYmd = todayYMDInVietnam();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const nextProductId = await getNextProductPriceId(client);
        const productResult = await client.query(
            `
      INSERT INTO mavryk.product_price
        (id, package, package_product, san_pham, pct_ctv, pct_khach, pct_promo, is_active, "update")
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
      RETURNING id;
    `, [
                nextProductId,
                normalizedPackageName,
                normalizedPackageProduct,
                normalizedSanPham,
                pctCtvValue,
                pctKhachValue,
                pctPromoValue,
                todayYmd,
            ]
        );
        const productId = productResult.rows?.[0]?.id ?? nextProductId;
        if (!productId) {
            await client.query("ROLLBACK");
            return res
                .status(500)
                .json({ error: "Khong the tao san pham moi." });
        }

        for (const supplier of supplierEntries) {
            const sourceName = normalizeTextInput(supplier?.sourceName);
            const numberBank = normalizeTextInput(supplier?.numberBank);
            const bankBin = normalizeTextInput(supplier?.bankBin);
            const priceValue = toNullableNumber(supplier?.price);

            if (!sourceName) {
                await client.query("ROLLBACK");
                return res
                    .status(400)
                    .json({ error: "Ten nguon khong duoc bo trong." });
            }
            if (!bankBin) {
                await client.query("ROLLBACK");
                return res
                    .status(400)
                    .json({ error: "Vui long chon ngan hang cho nguon." });
            }
            if (!priceValue || priceValue <= 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: `Gia nhap cho nguon ${sourceName} phai lon hon 0.`,
                });
            }

            let supplyId = await findSupplyIdByName(client, sourceName);
            if (!supplyId) {
                const nextSupplyId = await getNextSupplyId(client);
                const statusColumn = await resolveSupplyStatusColumn();
                const fields = ["id", "source_name", "number_bank", "bin_bank"];
                const values = [nextSupplyId, sourceName, numberBank || null, bankBin];
                if (statusColumn) {
                    fields.push(`"${statusColumn}"`);
                    values.push("active");
                }
                const placeholders = values.map((_, index) => `$${index + 1}`);
                const insertSupply = await client.query(
                    `
          INSERT INTO mavryk.supply (${fields.join(", ")})
          VALUES (${placeholders.join(", ")})
          RETURNING id;
        `,
                    values
                );
                supplyId = insertSupply.rows?.[0]?.id ?? nextSupplyId;
            }

            if (!supplyId) {
                await client.query("ROLLBACK");
                return res
                    .status(500)
                    .json({ error: "Khong the tao nha cung cap moi." });
            }

            const nextSupplyPriceId = await getNextSupplyPriceId(client);
            await client.query(
                `
        INSERT INTO mavryk.supply_price (id, product_id, source_id, price)
        VALUES ($1, $2, $3, $4);
      `, [nextSupplyPriceId, productId, supplyId, priceValue]
            );
        }

        const normalizedRow = await fetchProductPriceRowById(client, productId);
        await client.query("COMMIT");
        if (!normalizedRow) {
            return res.status(201).json({ id: productId });
        }
        res.status(201).json(normalizedRow);
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Mutation failed (POST /api/product-prices):", error);
        const friendlyMessage = mapPostgresErrorToMessage(error);
        res.status(friendlyMessage ? 400 : 500).json({
            error: friendlyMessage || "Unable to create product pricing.",
        });
    } finally {
        client.release();
    }
});

app.post("/api/product-prices/:productId/suppliers", async(req, res) => {
    const { productId } = req.params;
    const parsedProductId = Number(productId);
    if (!Number.isFinite(parsedProductId) || parsedProductId <= 0) {
        return res.status(400).json({ error: "Invalid product id." });
    }

    const { sourceName, price } = req.body || {};
    const normalizedSourceName = normalizeTextInput(sourceName);
    const normalizedPrice = toNullableNumber(price);

    if (!normalizedSourceName) {
        return res.status(400).json({ error: "Ten nguon khong duoc bo trong." });
    }
    if (!normalizedPrice || normalizedPrice <= 0) {
        return res
            .status(400)
            .json({ error: "Gia nhap phai lon hon 0." });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const productExists = await client.query(
            `SELECT id FROM mavryk.product_price WHERE id = $1 LIMIT 1;`, [parsedProductId]
        );
        if (!productExists.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Product pricing not found." });
        }

        const supplyId = await ensureSupplyRecord(
            client,
            normalizedSourceName
        );

        const duplicateCheck = await client.query(
            `
      SELECT id FROM mavryk.supply_price
      WHERE product_id = $1 AND source_id = $2
      LIMIT 1;
    `, [parsedProductId, supplyId]
        );
        if (duplicateCheck.rows.length) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                error: "Nguon nay da ton tai cho san pham.",
            });
        }

        const nextSupplyPriceId = await getNextSupplyPriceId(client);
        await client.query(
            `
      INSERT INTO mavryk.supply_price (id, product_id, source_id, price)
      VALUES ($1, $2, $3, $4);
    `, [nextSupplyPriceId, parsedProductId, supplyId, normalizedPrice]
        );

        await client.query("COMMIT");
        res.status(201).json({
            productId: parsedProductId,
            sourceId: supplyId,
            sourceName: normalizedSourceName,
            price: normalizedPrice,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(
            `Mutation failed (POST /api/product-prices/${productId}/suppliers):`,
            error
        );
        res.status(500).json({
            error: "Unable to add supplier price for this product.",
        });
    } finally {
        client.release();
    }
});

app.patch("/api/product-prices/:productId", async(req, res) => {
    const { productId } = req.params;
    const {
        packageName,
        packageProduct,
        sanPham,
        pctCtv,
        pctKhach,
        pctPromo,
    } = req.body || {};

    const parsedId = Number(productId);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
        return res.status(400).json({ error: "Invalid product id." });
    }

    const normalizedPackageName = normalizeTextInput(packageName);
    const normalizedPackageProduct = normalizeTextInput(packageProduct);
    const normalizedSanPham = normalizeTextInput(sanPham);

    if (!normalizedSanPham) {
        return res.status(400).json({ error: "Product code (san_pham) is required." });
    }

    const pctCtvValue = toNullableNumber(pctCtv);
    const pctKhachValue = toNullableNumber(pctKhach);
    const pctPromoValue = toNullableNumber(pctPromo);

    if (!Number.isFinite(pctCtvValue) || pctCtvValue <= 0) {
        return res.status(400).json({ error: "pct_ctv must be a positive number." });
    }
    if (!Number.isFinite(pctKhachValue) || pctKhachValue <= 0) {
        return res.status(400).json({ error: "pct_khach must be a positive number." });
    }
    if (pctPromoValue !== null) {
        const MIN_PROMO_RATIO = 0.01;
        const promoGap = pctCtvValue - pctKhachValue;
        if (!Number.isFinite(pctPromoValue) || pctPromoValue < MIN_PROMO_RATIO) {
            return res.status(400).json({
                error: `pct_promo must be at least ${MIN_PROMO_RATIO}.`,
            });
        }
        if (!Number.isFinite(promoGap) || promoGap < MIN_PROMO_RATIO) {
            return res.status(400).json({
                error: "Cannot set promo ratio because pct_ctv - pct_khach is too small.",
            });
        }
        if (pctPromoValue > promoGap) {
            return res.status(400).json({
                error: "pct_promo cannot exceed (pct_ctv - pct_khach).",
            });
        }
    }

    const todayYmd = todayYMDInVietnam();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const updateResult = await client.query(
            `
      UPDATE mavryk.product_price
      SET package = $1,
          package_product = $2,
          san_pham = $3,
          pct_ctv = $4,
          pct_khach = $5,
          pct_promo = $6,
          update = $7
      WHERE id = $8
      RETURNING id;
    `, [
                normalizedPackageName || null,
                normalizedPackageProduct || null,
                normalizedSanPham,
                pctCtvValue,
                pctKhachValue,
                pctPromoValue,
                todayYmd,
                parsedId,
            ]
        );

        if (updateResult.rowCount === 0) {
            return res
                .status(404)
                .json({ error: "Product pricing record not found." });
        }

        const normalizedRow = await fetchProductPriceRowById(client, parsedId);
        await client.query("COMMIT");
        if (!normalizedRow) {
            return res
                .status(404)
                .json({ error: "Unable to load updated product pricing row." });
        }
        res.json(normalizedRow);
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(
            `Mutation failed (PATCH /api/product-prices/${productId}):`,
            error
        );
        const friendlyMessage = mapPostgresErrorToMessage(error);
        if (friendlyMessage) {
            return res.status(400).json({ error: friendlyMessage });
        }
        res.status(500).json({
            error: "Unable to update product pricing row.",
        });
    } finally {
        client.release();
    }
});

app.patch("/api/product-prices/:productId/status", async(req, res) => {
    const { productId } = req.params;
    const { is_active } = req.body || {};

    const parsedId = Number(productId);
    if (!Number.isFinite(parsedId)) {
        return res.status(400).json({ error: "Invalid product id." });
    }
    if (typeof is_active !== "boolean") {
        return res.status(400).json({ error: "is_active must be boolean." });
    }

    try {
        const updatedDateObj = new Date();
        const updatedAtIso = updatedDateObj.toISOString();
        const updatedAtDateOnly = updatedAtIso.slice(0, 10);
        const result = await pool.query(
            `
      UPDATE mavryk.product_price
      SET is_active = $1,
          update = $2
      WHERE id = $3
      RETURNING id, is_active, update;
    `, [is_active, updatedAtDateOnly, parsedId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Product pricing record not found." });
        }
        const row = result.rows[0] || {};
        const normalizedUpdateDate =
            row.update instanceof Date ?
            row.update.toISOString() :
            updatedAtIso;
        res.json({
            id: row.id,
            is_active: row.is_active,
            update: normalizedUpdateDate,
        });
    } catch (error) {
        console.error(`Mutation failed (PATCH /api/product-prices/${productId}/status):`, error);
        res.status(500).json({
            error: "Unable to update product status.",
        });
    }
});

app.get("/api/products/supplies-by-name/:productName", async(req, res) => {
    const { productName } = req.params;
    console.log(`[GET] /api/products/supplies-by-name/${productName}`);

    const q = `
    SELECT DISTINCT
      s.id,
      COALESCE(NULLIF(TRIM(s.source_name::text), ''), CONCAT('Nguá»“n #', s.id)) AS source_name
    FROM mavryk.supply s
    JOIN mavryk.supply_price sp ON s.id = sp.source_id
    JOIN mavryk.product_price pp ON sp.product_id = pp.id
    WHERE TRIM(pp.san_pham::text) = TRIM($1::text)
    ORDER BY source_name;
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

app.get("/api/banks", async(_req, res) => {
    console.log("[GET] /api/banks");
    const q = `
    SELECT
      TRIM(bin::text) AS bin,
      TRIM(bank_name::text) AS bank_name
    FROM mavryk.bank_list
    WHERE TRIM(bin::text) <> ''
    ORDER BY bank_name;
  `;
    try {
        const result = await pool.query(q);
        const banks = (result.rows || []).map((row) => ({
            bin: row.bin || "",
            name: row.bank_name || "",
        }));
        res.json(banks);
    } catch (error) {
        console.error("Query failed (GET /api/banks):", error);
        res.status(500).json({
            error: "Unable to load bank list.",
        });
    }
});

app.post("/api/supplies", async(req, res) => {
    console.log("[POST] /api/supplies", req.body);
    const { sourceName, numberBank, bankBin, status } = req.body || {};
    const trimmedName = typeof sourceName === "string" ? sourceName.trim() : "";
    const trimmedAccount = typeof numberBank === "string" ?
        numberBank.trim() :
        "";
    const trimmedBin = typeof bankBin === "string" ? bankBin.trim() : "";
    const trimmedStatus = typeof status === "string" ? status.trim() : "";
    const normalizedStatus = normalizeSupplyStatus(trimmedStatus);
    const isActive = normalizedStatus !== "inactive";

    if (!trimmedName) {
        return res.status(400).json({
            error: "Supplier name is required.",
        });
    }
    if (!trimmedBin) {
        return res.status(400).json({
            error: "Bank selection is required.",
        });
    }

    try {
        const statusColumn = await resolveSupplyStatusColumn();
        const fields = ["source_name", "number_bank", "bin_bank", "active_supply"];
        const values = [trimmedName, trimmedAccount || null, trimmedBin, isActive];
        if (statusColumn && trimmedStatus) {
            fields.push(`"${statusColumn}"`);
            values.push(trimmedStatus);
        }
        const placeholders = values.map((_, index) => `$${index + 1}`);
        const insertQuery = `
      INSERT INTO mavryk.supply (${fields.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING id;
    `;
        const insertResult = await pool.query(insertQuery, values);
        const newId = insertResult.rows?.[0]?.id;
        if (!newId) {
            return res
                .status(500)
                .json({ error: "Unable to create supplier record." });
        }

        const detailQuery = `
      SELECT
        s.id,
        s.source_name,
        s.number_bank,
        s.bin_bank,
        COALESCE(s.active_supply, TRUE) AS active_supply,
        COALESCE(bl.bank_name, '') AS bank_name
      FROM mavryk.supply s
      LEFT JOIN mavryk.bank_list bl
        ON TRIM(bl.bin::text) = TRIM(s.bin_bank::text)
      WHERE s.id = $1
      LIMIT 1;
    `;
        const detailResult = await pool.query(detailQuery, [newId]);
        const row = detailResult.rows[0];
        res.status(201).json({
            id: row?.id || newId,
            sourceName: row?.source_name || trimmedName,
            numberBank: row?.number_bank || trimmedAccount || null,
            binBank: row?.bin_bank || trimmedBin || null,
            bankName: row?.bank_name || null,
            status: isActive ? "active" : "inactive",
            isActive,
        });
    } catch (error) {
        console.error("Mutation failed (POST /api/supplies):", error);
        res.status(500).json({
            error: "Unable to create supplier.",
        });
    }
});

app.patch("/api/supplies/:supplyId/active", async(req, res) => {
    const { supplyId } = req.params;
    const parsedSupplyId = Number.parseInt(supplyId, 10);
    if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
        return res.status(400).json({ error: "Invalid supplier id." });
    }

    const { isActive } = req.body || {};
    if (typeof isActive !== "boolean") {
        return res.status(400).json({ error: "Missing or invalid active flag." });
    }

    try {
        const statusColumn = await resolveSupplyStatusColumn();
        const statusLabel = isActive ? "Đang Hoạt Động" : "Tạm Dừng";
        const params = statusColumn ?
            [isActive, statusLabel, parsedSupplyId] : [isActive, parsedSupplyId];
        const updateQuery = statusColumn ?
            `
      UPDATE mavryk.supply
      SET active_supply = $1,
          "${statusColumn}" = $2
      WHERE id = $3
      RETURNING active_supply, "${statusColumn}" AS raw_status;
    ` :
            `
      UPDATE mavryk.supply
      SET active_supply = $1
      WHERE id = $2
      RETURNING active_supply;
    `;
        const updateResult = await pool.query(updateQuery, params);
        if (!updateResult.rows.length) {
            return res.status(404).json({ error: "Supplier not found." });
        }
        const updatedRow = updateResult.rows[0];
        const resolvedActive = updatedRow.active_supply === true;
        res.json({
            id: parsedSupplyId,
            isActive: resolvedActive,
            status: resolvedActive ? "active" : "inactive",
        });
    } catch (error) {
        console.error("Mutation failed (PATCH /api/supplies/:id/active):", error);
        res.status(500).json({ error: "Unable to update supplier status." });
    }
});

app.delete("/api/supplies/:supplyId", async(req, res) => {
    const { supplyId } = req.params;
    const parsedSupplyId = Number.parseInt(supplyId, 10);
    if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
        return res.status(400).json({ error: "Invalid supplier id." });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(
            `
      DELETE FROM mavryk.supply_price
      WHERE source_id = $1;
    `, [parsedSupplyId]
        );
        const deleteResult = await client.query(
            `
      DELETE FROM mavryk.supply
      WHERE id = $1
      RETURNING id;
    `, [parsedSupplyId]
        );
        if (!deleteResult.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Supplier not found." });
        }
        await client.query("COMMIT");
        res.json({ success: true, id: parsedSupplyId });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(
            `Mutation failed (DELETE /api/supplies/${parsedSupplyId}):`,
            error
        );
        res.status(500).json({ error: "Unable to delete supplier." });
    } finally {
        client.release();
    }
});

app.delete("/api/product-prices/:productId", async(req, res) => {
    const { productId } = req.params;
    const parsedProductId = Number.parseInt(productId, 10);
    if (!Number.isFinite(parsedProductId) || parsedProductId <= 0) {
        return res.status(400).json({ error: "Invalid product id." });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(
            `
      DELETE FROM mavryk.supply_price
      WHERE product_id = $1;
    `, [parsedProductId]
        );
        const deleteResult = await client.query(
            `
      DELETE FROM mavryk.product_price
      WHERE id = $1
      RETURNING id;
    `, [parsedProductId]
        );
        if (!deleteResult.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Product price not found." });
        }
        await client.query("COMMIT");
        res.json({ success: true, id: parsedProductId });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(
            `Mutation failed (DELETE /api/product-prices/${parsedProductId}):`,
            error
        );
        res.status(500).json({
            error: "Unable to delete product price.",
        });
    } finally {
        client.release();
    }
});

app.get("/api/supplies/:supplyId/overview", async(req, res) => {
    const { supplyId } = req.params;
    console.log(`[GET] /api/supplies/${supplyId}/overview`);

    const parsedSupplyId = Number.parseInt(supplyId, 10);
    if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
        return res.status(400).json({
            error: "Invalid supply id.",
        });
    }

    const client = await pool.connect();
    try {
        const statusColumnName = await resolveSupplyStatusColumn();
        const statusSelect = statusColumnName ?
            `s."${statusColumnName}"::text AS raw_status` :
            "NULL AS raw_status";
        const supplySourceKey = createSourceKey("s.source_name");
        const { monthStart, nextMonthStart } = getCurrentMonthRange();
        const paymentStatusKey = createVietnameseStatusKey("ps.status");

        const supplyQuery = `
      SELECT
        s.id,
        s.source_name,
        s.number_bank,
        s.bin_bank,
        ${statusSelect},
        COALESCE(s.active_supply, TRUE) AS active_supply,
        COALESCE(bl.bank_name, '') AS bank_name,
        ${supplySourceKey} AS supply_key
      FROM mavryk.supply s
      LEFT JOIN mavryk.bank_list bl
        ON TRIM(bl.bin::text) = TRIM(s.bin_bank::text)
      WHERE s.id = $1
      LIMIT 1;
    `;
        const supplyResult = await client.query(supplyQuery, [parsedSupplyId]);
        if (!supplyResult.rows.length) {
            return res.status(404).json({ error: "Supplier not found." });
        }
        const supplyRow = supplyResult.rows[0];
        const supplyKey = supplyRow.supply_key || "";

        let totalOrders = 0;
        let monthlyOrders = 0;
        if (supplyKey) {
            const statsQuery = `
        WITH orders_union AS (
          SELECT
            ${createDateNormalization("ngay_dang_ki")} AS order_date,
            COALESCE(${createSourceKey("nguon")}, '') AS source_key
          FROM mavryk.order_list
          WHERE TRIM(nguon::text) <> ''
          UNION ALL
          SELECT
            ${createDateNormalization("ngay_dang_ki")} AS order_date,
            COALESCE(${createSourceKey("nguon")}, '') AS source_key
          FROM mavryk.order_expired
          WHERE TRIM(nguon::text) <> ''
          UNION ALL
          SELECT
            ${createDateNormalization("ngay_dang_ki")} AS order_date,
            COALESCE(${createSourceKey("nguon")}, '') AS source_key
          FROM mavryk.order_canceled
          WHERE TRIM(nguon::text) <> ''
        )
        SELECT
          COUNT(*) AS total_orders,
          COUNT(*) FILTER (
            WHERE order_date >= $2::date
              AND order_date < $3::date
          ) AS monthly_orders
        FROM orders_union
        WHERE source_key = $1;
      `;
            const statsResult = await client.query(statsQuery, [
                supplyKey,
                monthStart,
                nextMonthStart,
            ]);
            const statsRow = statsResult.rows[0] || {};
            totalOrders = Number(statsRow.total_orders) || 0;
            monthlyOrders = Number(statsRow.monthly_orders) || 0;
        }

        let canceledOrders = 0;
        if (supplyKey) {
            const canceledQuery = `
        SELECT COUNT(*) AS canceled_orders
        FROM mavryk.order_canceled
        WHERE TRIM(nguon::text) <> ''
          AND ${createSourceKey("nguon")} = $1;
      `;
            const canceledResult = await client.query(canceledQuery, [supplyKey]);
            canceledOrders = Number(canceledResult.rows?.[0]?.canceled_orders) || 0;
        }

        const totalPaidQuery = `
      SELECT
        COALESCE(
          SUM(
            CASE WHEN ${paymentStatusKey} = 'da thanh toan'
              THEN COALESCE(ps.paid, 0)
              ELSE 0
            END
          ),
          0
        ) AS total_paid_amount
      FROM mavryk.payment_supply ps
      WHERE ps.source_id = $1;
    `;
        const totalPaidResult = await client.query(totalPaidQuery, [parsedSupplyId]);
        const totalPaidAmount = Number(totalPaidResult.rows?.[0]?.total_paid_amount) || 0;

        const unpaidQuery = `
      SELECT
        ps.id,
        ps.round,
        COALESCE(ps.import, 0) AS import_value,
        COALESCE(ps.paid, 0) AS paid_value,
        COALESCE(ps.status, '') AS status_label
      FROM mavryk.payment_supply ps
      WHERE ps.source_id = $1
        AND ${paymentStatusKey} = 'chua thanh toan'
      ORDER BY ps.id DESC;
    `;
        const unpaidResult = await client.query(unpaidQuery, [parsedSupplyId]);
        const unpaidPayments = (unpaidResult.rows || []).map((row) => ({
            id: row.id,
            round: row.round || "",
            totalImport: Number(row.import_value) || 0,
            paid: Number(row.paid_value) || 0,
            status: row.status_label || "",
        }));

        res.json({
            supply: {
                id: supplyRow.id,
                sourceName: supplyRow.source_name || "",
                numberBank: supplyRow.number_bank || null,
                binBank: supplyRow.bin_bank || null,
                bankName: supplyRow.bank_name || null,
                status: supplyRow.active_supply === false ?
                    "inactive" :
                    normalizeSupplyStatus(supplyRow.raw_status),
                rawStatus: supplyRow.raw_status || null,
                isActive: supplyRow.active_supply === true,
            },
            stats: {
                totalOrders,
                canceledOrders,
                monthlyOrders,
                totalPaidAmount,
            },
            unpaidPayments,
        });
    } catch (error) {
        console.error("Query failed (GET /api/supplies/:id/overview):", error);
        res.status(500).json({
            error: "Unable to load supplier overview.",
        });
    } finally {
        client.release();
    }
});

app.post("/api/payment-supply/:paymentId/confirm", async(req, res) => {
    const { paymentId } = req.params;
    console.log(`[POST] /api/payment-supply/${paymentId}/confirm`, req.body);

    const parsedPaymentId = Number.parseInt(paymentId, 10);
    if (!Number.isInteger(parsedPaymentId) || parsedPaymentId <= 0) {
        return res.status(400).json({
            error: "Invalid payment id.",
        });
    }

    const paidAmountRaw = req.body?.paidAmount;
    const paidAmountNumber = Number(paidAmountRaw);
    const hasPaidAmount = Number.isFinite(paidAmountNumber) && paidAmountNumber >= 0;

    try {
        const updateQuery = `
      UPDATE mavryk.payment_supply
      SET status = 'Đã Thanh Toán',
          paid = CASE
            WHEN $2::numeric IS NOT NULL AND $2::numeric >= 0
              THEN $2::numeric
            ELSE COALESCE(import, 0)
          END
      WHERE id = $1
      RETURNING id, source_id, import, paid, status, round;
    `;
        const result = await pool.query(updateQuery, [
            parsedPaymentId,
            hasPaidAmount ? paidAmountNumber : null,
        ]);
        if (!result.rows.length) {
            return res.status(404).json({ error: "Payment record not found." });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(
            `Mutation failed (POST /api/payment-supply/${paymentId}/confirm):`,
            error
        );
        res.status(500).json({
            error: "Unable to confirm payment.",
        });
    }
});

app.post("/api/calculate-price", async(req, res) => {
    console.log("[POST] /api/calculate-price");
    const { supply_id, san_pham_name, id_don_hang, customer_type } =
    req.body || {};

    if (!san_pham_name || !id_don_hang) {
        return res.status(400).json({
            error: "Missing required fields: san_pham_name and id_don_hang.",
        });
    }

    const parsedSupplyId = Number(supply_id);

    const orderLookupQuery = `
    SELECT gia_ban, gia_nhap
    FROM mavryk.order_list
    WHERE LOWER(TRIM(id_don_hang)) = LOWER(TRIM($1))
    LIMIT 1;
  `;

    const productLookupQuery = `
    SELECT id, pct_ctv, pct_khach, is_active
    FROM mavryk.product_price
    WHERE san_pham = $1
    LIMIT 1;
  `;

    const productSupplyPricesQuery = `
    SELECT source_id, price
    FROM mavryk.supply_price
    WHERE product_id = $1
  `;

    try {
        const orderResult = await pool.query(orderLookupQuery, [id_don_hang]);
        const productResult = await pool.query(productLookupQuery, [san_pham_name]);

        const orderRow = orderResult.rows[0] || {};
        const productPricing = productResult.rows[0];

        const currentOrderPrice = Number(orderRow.gia_ban);
        const currentOrderImport = Number(orderRow.gia_nhap);

        const normalizedId = String(id_don_hang || "").trim().toUpperCase();
        const normalizedCustomerType = String(customer_type || "")
            .trim()
            .toUpperCase();
        const isMavc =
            normalizedId.startsWith("MAVC") || normalizedCustomerType === "MAVC";

        const pctCtvRaw = Number(productPricing?.pct_ctv);
        const pctKhachRaw = Number(productPricing?.pct_khach);
        const pctCtv =
            Number.isFinite(pctCtvRaw) && pctCtvRaw > 0 ? pctCtvRaw : 1.0;
        const pctKhach =
            Number.isFinite(pctKhachRaw) && pctKhachRaw > 0 ? pctKhachRaw : 1.0;

        const computeSalePrice = (baseValue) => {
            if (!Number.isFinite(baseValue) || baseValue <= 0) return null;
            let price = baseValue * pctCtv;
            if (!isMavc) {
                price *= pctKhach;
            }
            return Helpers.roundGiaBanValue(Math.max(0, price));
        };

        let basePrice =
            Number.isFinite(currentOrderPrice) && currentOrderPrice > 0 ?
            currentOrderPrice :
            0;
        let giaNhap =
            Number.isFinite(currentOrderImport) && currentOrderImport > 0 ?
            currentOrderImport :
            null;
        let finalPrice = null;

        if (productPricing) {
            const isActive =
                productPricing.is_active === true ||
                (typeof productPricing.is_active === "string" &&
                    productPricing.is_active.trim().toLowerCase() === "true");

            const supplyPriceRows = productPricing ?
                (
                    await pool.query(productSupplyPricesQuery, [productPricing.id])
                ).rows || [] : [];

            const maxPrice = supplyPriceRows.reduce((max, row) => {
                const price = Number(row.price);
                return Number.isFinite(price) && price > max ? price : max;
            }, 0);

            if (
                Number.isFinite(parsedSupplyId) &&
                parsedSupplyId > 0 &&
                supplyPriceRows.length
            ) {
                const matched = supplyPriceRows.find(
                    (row) => Number(row.source_id) === parsedSupplyId
                );
                if (matched && Number.isFinite(Number(matched.price))) {
                    giaNhap = Number(matched.price);
                }
            }

            if (
                (giaNhap === null || !Number.isFinite(giaNhap)) &&
                Number.isFinite(maxPrice) &&
                maxPrice > 0
            ) {
                giaNhap = maxPrice;
            }

            if (Number.isFinite(maxPrice) && maxPrice > 0) {
                basePrice = maxPrice;
            }

            const computed = computeSalePrice(basePrice);
            if (computed !== null) {
                finalPrice = computed;
            }

            if (!isActive && finalPrice === null) {
                finalPrice = Helpers.roundGiaBanValue(Math.max(0, basePrice));
            }
        }

        if (finalPrice === null) {
            if (!Number.isFinite(basePrice) || basePrice <= 0) {
                basePrice =
                    Number.isFinite(currentOrderPrice) && currentOrderPrice > 0 ?
                    currentOrderPrice :
                    0;
            }
            finalPrice = Helpers.roundGiaBanValue(Math.max(0, basePrice));
        }

        if (!Number.isFinite(giaNhap) || giaNhap === null) {
            giaNhap = Number.isFinite(basePrice) ? basePrice : 0;
        }

        const months = Helpers.monthsFromString(san_pham_name);
        const days = Helpers.daysFromMonths(months) || 30;

        const roundedGiaNhap = roundToNearestThousand(
            Helpers.roundGiaBanValue(Number(giaNhap) || 0)
        );
        const roundedGiaBan = roundToNearestThousand(
            Helpers.roundGiaBanValue(Math.max(0, Number(finalPrice) || 0))
        );

        res.json({
            gia_nhap: Math.max(0, roundedGiaNhap),
            gia_ban: Math.max(0, roundedGiaBan),
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

app.post("/api/orders", async(req, res) => {
    console.log("[POST] /api/orders");
    const payload = sanitizeOrderWritePayload(req.body);
    delete payload.id;

    payload.ngay_dang_ki = normalizeDateInput(payload.ngay_dang_ki);
    payload.het_han = normalizeDateInput(payload.het_han);
    payload.tinh_trang = "Chưa Thanh Toán";
    payload.check_flag = null;
    const normalizedSourceName = normalizeTextInput(payload.nguon);
    if (normalizedSourceName) {
        payload.nguon = normalizedSourceName;
    }

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

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        if (normalizedSourceName) {
            await ensureSupplyRecord(client, normalizedSourceName);
        }
        const result = await client.query(q, values);
        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res
                .status(500)
                .json({ error: "Order was not created, database returned no rows." });
        }

        await client.query("COMMIT");
        const normalizedRow = normalizeOrderRow(result.rows[0], todayYMDInVietnam());
        res.status(201).json(normalizedRow);
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Insert failed (POST /api/orders):", error);
        res.status(500).json({
            error: "Unable to create order.",
        });
    } finally {
        client.release();
    }
});

app.put("/api/orders/:id", async(req, res) => {
    const { id } = req.params;
    console.log(`[PUT] /api/orders/${id}`);
    const parsedId = Number(id);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
        return res.status(400).json({ error: "Invalid order id." });
    }

    const payload = sanitizeOrderWritePayload(req.body);
    delete payload.id;

    const fields = Object.keys(payload);
    if (fields.length === 0) {
        return res
            .status(400)
            .json({ error: "No valid fields were provided for update." });
    }

    const setClauses = fields.map((column, index) => `"${column}" = $${index + 1}`);
    const values = fields.map((column) => payload[column]);

    const q = `
    UPDATE mavryk.order_list
    SET ${setClauses.join(", ")}
    WHERE id = $${fields.length + 1}
    RETURNING *,
      ngay_dang_ki::text AS ngay_dang_ki_raw,
      het_han::text      AS het_han_raw;
  `;

    try {
        const result = await pool.query(q, [...values, parsedId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Order not found." });
        }
        const normalizedRow = normalizeOrderRow(result.rows[0], todayYMDInVietnam());
        res.json(normalizedRow);
    } catch (error) {
        console.error(`Update failed (PUT /api/orders/${id}):`, error);
        res.status(500).json({ error: "Unable to update order." });
    }
});

app.delete("/api/orders/:id", async(req, res) => {
    const { id } = req.params;
    console.log(`[DELETE] /api/orders/${id}`);
    const parsedId = Number(id);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
        return res.status(400).json({ error: "Invalid order id." });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const existingResult = await client.query(
            `
      SELECT *,
             ngay_dang_ki::text AS ngay_dang_ki_raw,
             het_han::text      AS het_han_raw
      FROM mavryk.order_list
      WHERE id = $1
    `, [parsedId]
        );

        if (existingResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Order not found." });
        }

        const todayYmd = todayYMDInVietnam();
        const cancellationRefundRaw =
            req.body?.can_hoan ??
            req.body?.gia_tri_con_lai ??
            req.body?.canHoan ??
            null;
        const cancellationRefund = toNullableNumber(cancellationRefundRaw);
        const normalizedRow = normalizeOrderRow(existingResult.rows[0], todayYmd);
        const remainingDays =
            typeof normalizedRow.so_ngay_con_lai === "number" ?
            normalizedRow.so_ngay_con_lai :
            null;
        const moveToExpired =
            remainingDays !== null && Number.isFinite(remainingDays) ?
            remainingDays < 4 :
            false;
        const archiveConfig = moveToExpired ? {
            table: "mavryk.order_expired",
            columns: ARCHIVE_COLUMNS_EXPIRED,
            overrides: {
                archived_at: new Date(),
            },
        } : {
            table: "mavryk.order_canceled",
            columns: ARCHIVE_COLUMNS_CANCELED,
            overrides: {
                can_hoan: cancellationRefund,
                tinh_trang: "Chưa Hoàn",
                check_flag: false,
            },
        };
        const {
            sql: archiveSql,
            values: archiveValues
        } = buildArchiveInsert(
            archiveConfig.table,
            archiveConfig.columns,
            existingResult.rows[0], {
                ...archiveConfig.overrides,
            }
        );
        await client.query(archiveSql, archiveValues);

        await client.query(
            `
      DELETE FROM mavryk.order_list
      WHERE id = $1
    `, [parsedId]
        );

        await client.query("COMMIT");
        res.json({
            success: true,
            deletedId: parsedId,
            movedTo: moveToExpired ? "expired" : "canceled",
            deletedOrder: normalizedRow,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Delete failed (DELETE /api/orders/${id}):`, error);
        res.status(500).json({ error: "Unable to delete order." });
    } finally {
        client.release();
    }
});

app.get("/api/products/all-prices-by-name/:productName", async(req, res) => {
    const { productName } = req.params;
    console.log(`[GET] /api/products/all-prices-by-name/${productName}`);

    const q = `
    SELECT
      sp.source_id,
      COALESCE(
        NULLIF(TRIM(s.source_name::text), ''),
        CONCAT('NhÃ  cung c?p #', sp.source_id::text)
      ) AS source_name,
      sp.price,
      recent.last_order_date
    FROM mavryk.supply_price sp
    JOIN mavryk.product_price pp ON sp.product_id = pp.id
    LEFT JOIN mavryk.supply s ON sp.source_id = s.id
    LEFT JOIN LATERAL (
      SELECT MAX(ol.ngay_dang_ki) AS last_order_date
      FROM mavryk.order_list ol
      WHERE
        s.source_name IS NOT NULL
        AND LOWER(TRIM(ol.nguon)) = LOWER(TRIM(s.source_name::text))
    ) AS recent ON TRUE
    WHERE pp.san_pham = $1
    ORDER BY
      sp.price ASC NULLS LAST,
      COALESCE(recent.last_order_date, '1900-01-01'::date) DESC,
      source_name ASC;
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

app.patch(
    "/api/products/:productId/suppliers/:sourceId/price",
    async(req, res) => {
        const { productId, sourceId } = req.params;
        console.log(
            `[PATCH] /api/products/${productId}/suppliers/${sourceId}/price`,
            req.body
        );

        const parsedProductId = Number.parseInt(productId, 10);
        const parsedSourceId = Number.parseInt(sourceId, 10);

        if (!Number.isFinite(parsedProductId) || parsedProductId <= 0) {
            return res
                .status(400)
                .json({ error: "Invalid product id for supply price update." });
        }
        if (!Number.isFinite(parsedSourceId) || parsedSourceId <= 0) {
            return res
                .status(400)
                .json({ error: "Invalid supplier id for supply price update." });
        }

        const normalizedPrice = toNullableNumber(req.body?.price);
        if (normalizedPrice === null || normalizedPrice < 0) {
            return res
                .status(400)
                .json({ error: "Price must be a non-negative number." });
        }

        try {
            const result = await pool.query(
                `
        UPDATE mavryk.supply_price
        SET price = $1
        WHERE product_id = $2 AND source_id = $3
        RETURNING product_id, source_id, price;
      `, [normalizedPrice, parsedProductId, parsedSourceId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({
                    error: "Supply price not found for the provided ids.",
                });
            }

            const row = result.rows[0];
            res.json({
                productId: Number(row.product_id),
                sourceId: Number(row.source_id),
                price: Number(row.price),
            });
        } catch (error) {
            console.error(
                `[PATCH] /api/products/${productId}/suppliers/${sourceId}/price failed:`,
                error
            );
            res.status(500).json({
                error: "Unable to update supply price for this product.",
            });
        }
    }
);

app.delete(
    "/api/products/:productId/suppliers/:sourceId",
    async(req, res) => {
        const { productId, sourceId } = req.params;
        const parsedProductId = Number(productId);
        const parsedSourceId = Number(sourceId);

        if (!Number.isFinite(parsedProductId) ||
            parsedProductId <= 0 ||
            !Number.isFinite(parsedSourceId) ||
            parsedSourceId <= 0
        ) {
            return res.status(400).json({ error: "Invalid product or source id." });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const deleteResult = await client.query(
                `
        DELETE FROM mavryk.supply_price
        WHERE product_id = $1 AND source_id = $2
        RETURNING id;
      `, [parsedProductId, parsedSourceId]
            );
            if (!deleteResult.rows.length) {
                await client.query("ROLLBACK");
                return res
                    .status(404)
                    .json({ error: "Nguon nay khong ton tai cho san pham." });
            }
            await client.query("COMMIT");
            res.json({
                productId: parsedProductId,
                sourceId: parsedSourceId,
            });
        } catch (error) {
            await client.query("ROLLBACK");
            console.error(
                `[DELETE] /api/products/${productId}/suppliers/${sourceId} failed:`,
                error
            );
            res.status(500).json({
                error: "Unable to remove supplier price for this product.",
            });
        } finally {
            client.release();
        }
    }
);

app.get("/api/run-scheduler", async(_req, res) => {
    console.log("[GET] /api/run-scheduler");
    try {
        await updateDatabaseTask("manual");
        res.json({ success: true, message: "Cron job executed successfully." });
    } catch (error) {
        console.error("Cron job failed:", error);
        res.status(500).json({ error: "Unable to run scheduled task." });
    }
});
app.get("/api/scheduler/status", (_req, res) => {
    const status = getSchedulerStatus();
    res.json({
        ...status,
        lastRunAt: status.lastRunAt ? status.lastRunAt.toISOString() : null,
    });
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});

// Package products: export data with account storage details
app.get("/api/package-products", async(_req, res) => {
    console.log("[GET] /api/package-products");
    try {
        const result = await pool.query(`${PACKAGE_PRODUCTS_SELECT} ORDER BY pp.id ASC`);
        const rows = result.rows.map(mapPackageProductRow);
        res.json(rows);
    } catch (error) {
        console.error("Query failed (GET /api/package-products):", error);
        res.status(500).json({ error: "Unable to load package products." });
    }
});
app.post("/api/package-products", async(req, res) => {
    console.log("[POST] /api/package-products");
    const {
        packageName,
        informationUser,
        informationPass,
        informationMail,
        note,
        supplier,
        importPrice,
        slotLimit,
        accountUser,
        accountPass,
        accountMail,
        accountNote,
        capacity,
        expired,
        hasCapacityField,
        matchMode,
    } = req.body || {};
    if (!packageName || typeof packageName !== "string") {
        return res.status(400).json({ error: "Package name is required." });
    }
    const trimmedPackageName = packageName.trim();
    if (!trimmedPackageName) {
        return res.status(400).json({ error: "Package name cannot be empty." });
    }
    const client = await pool.connect();
    const normalizedExpired = normalizeDateInput(expired);
    const normalizedSlotLimit = toNullableNumber(slotLimit);
    const normalizedMatchMode = matchMode === "slot" ? "slot" : "thong_tin_don_hang";
    try {
        await client.query("BEGIN");
        const pkgResult = await client.query(
            `
        INSERT INTO mavryk.package_product
          (package, username, password, "mail 2nd", note, supplier, "Import", expired, slot, "match")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id;
      `, [
                trimmedPackageName,
                informationUser || null,
                informationPass || null,
                informationMail || null,
                note || null,
                supplier || null,
                toNullableNumber(importPrice),
                normalizedExpired,
                normalizedSlotLimit,
                normalizedMatchMode,
            ]
        );
        if (!pkgResult.rows.length) {
            throw new Error("Package insert returned no rows.");
        }
        const packageId = getRowId(pkgResult.rows[0], "id", "ID");
        if (packageId === null) {
            throw new Error("Package insert returned invalid id.");
        }
        const mailFamily = informationUser || null;
        let createdAccountStorageId = null;
        if (hasAccountStoragePayload({
                accountUser,
                accountPass,
                accountMail,
                accountNote,
                capacity,
            })) {
            const nextStorageId = await getNextAccountStorageId(client);
            await client.query(
                `
          INSERT INTO mavryk.account_storage
            (id, username, password, "Mail 2nd", note, storage, "Mail Family")
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [
                    nextStorageId,
                    accountUser || null,
                    accountPass || null,
                    accountMail || null,
                    accountNote || null,
                    toNullableNumber(capacity),
                    mailFamily,
                ]
            );
            createdAccountStorageId = nextStorageId;
        }
        const newRow = await fetchPackageProductById(client, packageId);
        await client.query("COMMIT");
        if (!newRow) {
            const fallbackRow = mapPackageProductRow({
                package_id: packageId,
                package_name: trimmedPackageName,
                package_username: informationUser || null,
                package_password: informationPass || null,
                package_mail_2nd: informationMail || null,
                package_note: note || null,
                package_supplier: supplier || null,
                package_import: toNullableNumber(importPrice),
                package_expired: normalizedExpired,
                package_slot: normalizedSlotLimit,
                package_match: normalizedMatchMode,
                account_id: createdAccountStorageId,
                account_username: accountUser || null,
                account_password: accountPass || null,
                account_mail_2nd: accountMail || null,
                account_note: accountNote || null,
                account_storage: toNullableNumber(capacity),
                account_mail_family: mailFamily,
                has_capacity_field: Boolean(hasCapacityField),
                package_products: [],
            });
            return res.status(201).json(fallbackRow);
        }
        res.status(201).json({
            ...newRow,
            hasCapacityField: Boolean(hasCapacityField),
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Insert failed (POST /api/package-products):", error);
        res.status(500).json({ error: "Unable to create package product." });
    } finally {
        client.release();
    }
});
app.put("/api/package-products/:id", async(req, res) => {
    const { id } = req.params;
    console.log(`[PUT] /api/package-products/${id}`);
    if (!id) {
        return res.status(400).json({ error: "Package product id is required." });
    }
    const {
        packageName,
        informationUser,
        informationPass,
        informationMail,
        note,
        supplier,
        importPrice,
        slotLimit,
        accountStorageId,
        accountUser,
        accountPass,
        accountMail,
        accountNote,
        capacity,
        expired,
        hasCapacityField,
        matchMode,
    } = req.body || {};
    if (!packageName || typeof packageName !== "string") {
        return res.status(400).json({ error: "Package name is required." });
    }
    const trimmedPackageName = packageName.trim();
    if (!trimmedPackageName) {
        return res.status(400).json({ error: "Package name cannot be empty." });
    }
    let storageIdNumber = null;
    if (accountStorageId !== undefined && accountStorageId !== null && accountStorageId !== "") {
        const parsed = Number(accountStorageId);
        storageIdNumber = Number.isFinite(parsed) ? parsed : null;
    }
    const client = await pool.connect();
    const normalizedExpired = normalizeDateInput(expired);
    const normalizedSlotLimit = toNullableNumber(slotLimit);
    const normalizedMatchMode = matchMode === "slot" ? "slot" : "thong_tin_don_hang";
    try {
        await client.query("BEGIN");
        const pkgResult = await client.query(
            `
        UPDATE mavryk.package_product
        SET package = $1,
            username = $2,
            password = $3,
            "mail 2nd" = $4,
            note = $5,
            supplier = $6,
            "Import" = $7,
            expired = $8,
            slot = $9,
            "match" = $10
        WHERE id = $11
        RETURNING id;
      `, [
                trimmedPackageName,
                informationUser || null,
                informationPass || null,
                informationMail || null,
                note || null,
                supplier || null,
                toNullableNumber(importPrice),
                normalizedExpired,
                normalizedSlotLimit,
                normalizedMatchMode,
                id,
            ]
        );
        if (!pkgResult.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Package product not found." });
        }
        const packageId = getRowId(pkgResult.rows[0], "id", "ID");
        const mailFamily = informationUser || null;
        const shouldUpsertAccountStorage = hasAccountStoragePayload({
            accountUser,
            accountPass,
            accountMail,
            accountNote,
            capacity,
        });
        if (storageIdNumber && shouldUpsertAccountStorage) {
            await client.query(
                `
          UPDATE mavryk.account_storage
          SET username = $1,
              password = $2,
              "Mail 2nd" = $3,
              note = $4,
              storage = $5,
              "Mail Family" = $6
          WHERE id = $7;
        `, [
                    accountUser || null,
                    accountPass || null,
                    accountMail || null,
                    accountNote || null,
                    toNullableNumber(capacity),
                    mailFamily,
                    storageIdNumber,
                ]
            );
        } else if (!storageIdNumber && shouldUpsertAccountStorage) {
            const nextStorageId = await getNextAccountStorageId(client);
            storageIdNumber = nextStorageId;
            await client.query(
                `
          INSERT INTO mavryk.account_storage
            (id, username, password, "Mail 2nd", note, storage, "Mail Family")
          VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [
                    nextStorageId,
                    accountUser || null,
                    accountPass || null,
                    accountMail || null,
                    accountNote || null,
                    toNullableNumber(capacity),
                    mailFamily,
                ]
            );
        }
        const updatedRow = await fetchPackageProductById(client, packageId ?? id);
        await client.query("COMMIT");
        if (!updatedRow) {
            const fallbackRow = mapPackageProductRow({
                package_id: packageId ?? id,
                package_name: trimmedPackageName,
                package_username: informationUser || null,
                package_password: informationPass || null,
                package_mail_2nd: informationMail || null,
                package_note: note || null,
                package_supplier: supplier || null,
                package_import: toNullableNumber(importPrice),
                package_expired: normalizedExpired,
                account_id: storageIdNumber,
                account_username: accountUser || null,
                account_password: accountPass || null,
                account_mail_2nd: accountMail || null,
                account_note: accountNote || null,
                account_storage: toNullableNumber(capacity),
                account_mail_family: mailFamily,
                has_capacity_field: Boolean(hasCapacityField),
                package_match: normalizedMatchMode,
                package_products: [],
            });
            return res.json(fallbackRow);
        }
        res.json({
            ...updatedRow,
            hasCapacityField: Boolean(hasCapacityField),
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Update failed (PUT /api/package-products/${id}):`, error);
        res.status(500).json({ error: "Unable to update package product." });
    } finally {
        client.release();
    }
});
const handleBulkDeletePackages = async(req, res) => {
    console.log(`[${req.method}] /api/package-products/bulk-delete`);
    const { packages } = req.body || {};
    if (!Array.isArray(packages)) {
        return res.status(400).json({ error: "packages must be an array." });
    }
    const names = Array.from(
        new Set(
            packages
            .map((name) => (typeof name === "string" ? name.trim() : ""))
            .filter(Boolean)
        )
    );
    if (!names.length) {
        return res.status(400).json({ error: "No package names provided." });
    }
    const client = await pool.connect();
    try {
        const deleteResult = await client.query(
            `DELETE FROM mavryk.package_product WHERE package = ANY($1::text[]) RETURNING package;`, [names]
        );
        const deletedNames = deleteResult.rows
            .map((row) => row.package)
            .filter(Boolean);
        res.json({
            deleted: deleteResult.rowCount || 0,
            deletedNames,
        });
    } catch (error) {
        console.error(`Delete failed (${req.method} /api/package-products/bulk-delete):`, error);
        res.status(500).json({ error: "Unable to delete package products." });
    } finally {
        client.release();
    }
};
app.delete("/api/package-products/bulk-delete", handleBulkDeletePackages);
app.post("/api/package-products/bulk-delete", handleBulkDeletePackages);
