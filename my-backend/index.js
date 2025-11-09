require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const { updateDatabaseTask, getSchedulerStatus } = require("./scheduler");
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
const getNextAccountStorageId = async (client) => {
    const result = await client.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM mavryk.account_storage`
    );
    const nextId = Number(result.rows?.[0]?.next_id ?? 1);
    return Number.isFinite(nextId) ? nextId : 1;
};
const fromDbNumber = (value) => {
    if (value === undefined || value === null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
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
        ["active", "dang hoat dong", "hoat dong", "running"].includes(
            normalized
        )
    ) {
        return "active";
    }
    if (
        ["inactive", "tam ngung", "tam dung", "pause", "paused"].includes(
            normalized
        )
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

const resolveSupplyStatusColumn = async () => {
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
        supplyStatusColumnNameCache = result.rows[0]?.column_name || null;
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
    acc.id AS account_id,
    acc.username AS account_username,
    acc.password AS account_password,
    acc."Mail 2nd" AS account_mail_2nd,
    acc.note AS account_note,
    acc.storage AS account_storage,
    acc."Mail Family" AS account_mail_family
  FROM mavryk.package_product pp
  LEFT JOIN mavryk.account_storage acc
    ON acc."Mail Family" = pp.username
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
    };
};
const fetchPackageProductById = async (client, id) => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    const result = await client.query(
        `${PACKAGE_PRODUCTS_SELECT} WHERE pp.id = $1`,
        [numericId]
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
      SELECT ngay_dang_ki::text AS raw_date FROM mavryk.order_list
      UNION ALL
      SELECT ngay_dang_ki::text AS raw_date FROM mavryk.order_expired
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
    return Math.max(0, Math.round(numeric / 1000) * 1000);
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
    let autoStatus = dbStatusRaw || "Chua Thanh Toan";
    let autoCheckFlag = normalizeCheckFlagValue(row.check_flag);

    if (autoStatus !== "Da Thanh Toan") {
        if (Number.isFinite(soNgayConLai)) {
            if (soNgayConLai <= 0) {
                autoStatus = "Het Han";
                autoCheckFlag = null;
            } else if (soNgayConLai > 0 && soNgayConLai <= 4) {
                autoStatus = "Can Gia Han";
                autoCheckFlag = null;
            }
        }
    }

    if (autoStatus === "Da Thanh Toan" && autoCheckFlag === null) {
        autoCheckFlag = true;
    }

    const finalStatus = dbStatusRaw || autoStatus;
    const dbCheckFlag = normalizeCheckFlagValue(row.check_flag);
    const finalCheckFlag =
        dbCheckFlag !== null ? dbCheckFlag : autoCheckFlag ?? null;

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

app.get("/api/orders", async(_req, res) => {
    console.log("[GET] /api/orders");
    // Fetch raw values without casting to DATE to avoid timezone effects
    const q = `
    SELECT *,
           ngay_dang_ki::text AS ngay_dang_ki_raw,
           het_han::text      AS het_han_raw
    FROM mavryk.order_list;
  `;

    try {
        const result = await pool.query(q);
        const todayYmd = todayYMDInVietnam();
        const mapped = result.rows.map((row) => normalizeOrderRow(row, todayYmd));
        res.json(mapped);
    } catch (error) {
        console.error("Query failed (GET /api/orders):", error);
        res.status(500).json({
            error: "Unable to load order list.",
        });
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
    )
    SELECT
      s.id,
      s.source_name,
      s.number_bank,
      s.bin_bank,
      ${statusSelect},
      COALESCE(bl.bank_name, '') AS bank_name,
      COALESCE(product_data.product_list, ARRAY[]::text[]) AS product_names,
      COALESCE(month_data.monthly_orders, 0) AS monthly_orders,
      COALESCE(month_data.monthly_import_value, 0) AS monthly_import_value,
      COALESCE(last_order.last_order_date, NULL) AS last_order_date,
      COALESCE(total_data.total_orders, 0) AS total_orders
    FROM mavryk.supply s
    LEFT JOIN product_data ON product_data.source_id = s.id
    LEFT JOIN month_data
      ON month_data.source_key = ${supplySourceKey}
    LEFT JOIN last_order
      ON last_order.source_key = ${supplySourceKey}
    LEFT JOIN total_data
      ON total_data.source_key = ${supplySourceKey}
    LEFT JOIN mavryk.bank_list bl
      ON TRIM(bl.bin::text) = TRIM(s.bin_bank::text)
    ORDER BY s.source_name;
  `;
    try {
        const result = await pool.query(query, [monthStart, nextMonthStart]);
        const rows = result.rows || [];
        const supplies = rows.map((row) => ({
            id: row.id,
            sourceName: row.source_name || "",
            numberBank: row.number_bank || null,
            binBank: row.bin_bank || null,
            bankName: row.bank_name || null,
            status: normalizeSupplyStatus(row.raw_status),
            rawStatus: row.raw_status || null,
            products: Array.isArray(row.product_names) ? row.product_names : [],
            monthlyOrders: Number(row.monthly_orders) || 0,
            monthlyImportValue: Number(row.monthly_import_value) || 0,
            lastOrderDate: formatDateOutput(row.last_order_date),
            totalOrders: Number(row.total_orders) || 0,
        }));
        const stats = supplies.reduce(
            (acc, supply) => {
                acc.totalSuppliers += 1;
                if (supply.status === "active") {
                    acc.activeSuppliers += 1;
                }
                acc.monthlyOrders += supply.monthlyOrders;
                acc.totalImportValue += supply.monthlyImportValue;
                return acc;
            },
            {
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

app.get("/api/products/supplies-by-name/:productName", async(req, res) => {
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

app.post("/api/calculate-price", async(req, res) => {
    console.log("[POST] /api/calculate-price");
    const { san_pham_name, id_don_hang, customer_type } = req.body || {};

    if (!san_pham_name || !id_don_hang) {
        return res.status(400).json({
            error: "Missing required fields: san_pham_name and id_don_hang.",
        });
    }

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
            normalizedId.startsWith("MAVC") ||
            normalizedCustomerType === "MAVC";

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

            if (isActive) {
                const supplyPriceResult = await pool.query(
                    `
          SELECT MAX(price) AS max_price
          FROM mavryk.supply_price
          WHERE product_id = $1;
        `,
                    [productPricing.id]
                );

                const maxPrice = Number(supplyPriceResult.rows[0]?.max_price);
                if (Number.isFinite(maxPrice) && maxPrice > 0) {
                    basePrice = maxPrice;
                    giaNhap = maxPrice;
                }
            } else {
                if (giaNhap === null && Number.isFinite(currentOrderImport) && currentOrderImport > 0) {
                    giaNhap = currentOrderImport;
                }
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
    const payload = {...req.body };
    delete payload.id;

    payload.ngay_dang_ki = normalizeDateInput(payload.ngay_dang_ki);
    payload.het_han = normalizeDateInput(payload.het_han);
    payload.tinh_trang = "Chua Thanh Toan";
    payload.check_flag = null;

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

        const normalizedRow = normalizeOrderRow(result.rows[0], todayYMDInVietnam());
        res.status(201).json(normalizedRow);
    } catch (error) {
        console.error("Insert failed (POST /api/orders):", error);
        res.status(500).json({
            error: "Unable to create order.",
        });
    }
});

app.get("/api/products/all-prices-by-name/:productName", async(req, res) => {
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
app.get("/api/package-products", async (_req, res) => {
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
app.post("/api/package-products", async (req, res) => {
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
    try {
        await client.query("BEGIN");
        const pkgResult = await client.query(
            `
        INSERT INTO mavryk.package_product
          (package, username, password, "mail 2nd", note, supplier, "Import", expired, slot)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `,
            [
                trimmedPackageName,
                informationUser || null,
                informationPass || null,
                informationMail || null,
                note || null,
                supplier || null,
                toNullableNumber(importPrice),
                normalizedExpired,
                normalizedSlotLimit,
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
        `,
                [
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
                package_slot: normalizedSlotLimit,
                account_id: createdAccountStorageId,
                account_username: accountUser || null,
                account_password: accountPass || null,
                account_mail_2nd: accountMail || null,
                account_note: accountNote || null,
                account_storage: toNullableNumber(capacity),
                account_mail_family: mailFamily,
                has_capacity_field: Boolean(hasCapacityField),
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
app.put("/api/package-products/:id", async (req, res) => {
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
            slot = $9
        WHERE id = $10
        RETURNING id;
      `,
            [
                trimmedPackageName,
                informationUser || null,
                informationPass || null,
                informationMail || null,
                note || null,
                supplier || null,
                toNullableNumber(importPrice),
                normalizedExpired,
                normalizedSlotLimit,
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
        `,
                [
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
        `,
                [
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
