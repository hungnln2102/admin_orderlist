require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const { updateDatabaseTask, getSchedulerStatus } = require("./scheduler");
const Helpers = require("./helpers");
const ORDER_PREFIXES = Helpers.ORDER_PREFIXES;
const {
    ORDER_COLS,
    ACCOUNT_STORAGE_COLS,
    BANK_LIST_COLS,
    PACKAGE_PRODUCT_COLS,
    PAYMENT_RECEIPT_COLS,
    PAYMENT_SUPPLY_COLS,
    PRODUCT_PRICE_COLS,
    PRODUCT_DESC_COLS,
    SUPPLY_COLS,
    SUPPLY_PRICE_COLS,
    USERS_COLS,
} = require("./schema/tables");
const sepayWebhookApp = require("./webhook/sepay_webhook");

const app = express();
const port = Number(process.env.PORT) || 3001;
const DB_SCHEMA = process.env.DB_SCHEMA || "mavryk";
const SEPAY_PORT = Number(process.env.SEPAY_PORT) || 5000;
const SEPAY_HOST = process.env.SEPAY_HOST || "0.0.0.0";

// Trust proxy so secure cookies work behind reverse proxy/HTTPS
app.set("trust proxy", true);

const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

// ------------------------------
// Utility helpers & normalizers (shared by multiple routes)
// ------------------------------

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

const VIETNAMESE_DIACRITICS_FROM =
    "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
const VIETNAMESE_DIACRITICS_TO =
    "a".repeat(17) +
    "e".repeat(11) +
    "i".repeat(5) +
    "o".repeat(17) +
    "u".repeat(11) +
    "y".repeat(5) +
    "d";
const VIETNAMESE_TRANSLITERATE_FROM =
    VIETNAMESE_DIACRITICS_FROM + VIETNAMESE_DIACRITICS_FROM.toUpperCase();
const VIETNAMESE_TRANSLITERATE_TO =
    VIETNAMESE_DIACRITICS_TO + VIETNAMESE_DIACRITICS_TO.toUpperCase();

const createVietnameseStatusKey = (column) => `
  LOWER(
    REGEXP_REPLACE(
      TRANSLATE(
        TRIM(${column}::text),
        '${VIETNAMESE_TRANSLITERATE_FROM}',
        '${VIETNAMESE_TRANSLITERATE_TO}'
      ),
      '\\s+',
      ' ',
      'g'
    )
  )
`;

const quoteIdent = (value) => {
    const str = value === undefined || value === null ? "" : String(value);
    const sanitized = str.replace(/"/g, '""');
    return `"${sanitized}"`;
};

const normalizeDateInput = (value) => {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;

    // If value already contains a YYYY-MM-DD, keep the date part only (strip time/zone to avoid off-by-one)
    const ymdMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymdMatch) {
        return ymdMatch[1];
    }
    const ymdSlashMatch = trimmed.match(/^(\d{4}\/\d{2}\/\d{2})/);
    if (ymdSlashMatch) {
        return ymdSlashMatch[1].replace(/\//g, "-");
    }

    const converted = Helpers.convertDMYToYMD(trimmed);
    if (!converted || String(converted).trim() === "") return null;
    // If still includes time portion after conversion, keep only the date section.
    const finalMatch = String(converted).trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return finalMatch ? finalMatch[1] : String(converted).trim();
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
    const nextRow = result.rows && result.rows.length > 0 ? result.rows[0] : null;
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
    const nextRow = result.rows && result.rows.length > 0 ? result.rows[0] : null;
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
    const nextRow = result.rows && result.rows.length > 0 ? result.rows[0] : null;
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
    const nextRow = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    const nextId = Number(
        nextRow && nextRow.next_id !== undefined ? nextRow.next_id : 1
    );
    return Number.isFinite(nextId) ? nextId : 1;
};

const getNextProductDescId = async(client) => {
    await client.query("LOCK TABLE mavryk.product_desc IN EXCLUSIVE MODE;");
    const result = await client.query(
        `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM mavryk.product_desc;`
    );
    const nextRow = result.rows && result.rows.length > 0 ? result.rows[0] : null;
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
    const fields = [supplyCols.id, supplyCols.sourceName];
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
    const newId =
        insertResult &&
        insertResult.rows &&
        insertResult.rows[0] &&
        insertResult.rows[0].id ?
        insertResult.rows[0].id :
        nextSupplyId;
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
    const { accountUser, accountPass, accountMail, accountNote, capacity } =
    payload;
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
    if (value === undefined || value === null) return "hoạt động";
    const normalized = String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    if (!normalized) return "hoạt động";
    if (
        ["active", "dang hoat dong", "hoat dong", "running"].includes(normalized)
    ) {
        return "hoạt động";
    }
    if (
        ["inactive", "tam ngung", "tam dung", "pause", "paused"].includes(
            normalized
        )
    ) {
        return "tạm dừng";
    }
    return normalized;
};

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error(`Yêu cầu bị chặn bởi CORS từ ${origin}`));
        },
        credentials: true,
    })
);

app.use(express.json());

const isProd = process.env.NODE_ENV === "production";
const cookieSecureEnv = (process.env.COOKIE_SECURE || "").toLowerCase();
const cookieSecure =
    cookieSecureEnv === "true" ||
    cookieSecureEnv === "1" ||
    (!cookieSecureEnv && isProd);
const cookieSameSite = cookieSecure ? "none" : "lax";

app.use(
    session({
        name: process.env.SESSION_NAME || "mavryk.sid",
        secret: process.env.SESSION_SECRET || "change_this_secret",
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            httpOnly: true,
            sameSite: cookieSameSite,
            secure: cookieSecure,
            maxAge: 1000 * 60 * 60 * 1, // 1 hour inactivity
        },
    })
);

const AUTH_OPEN_PATHS = new Set(["/api/auth/login", "/api/auth/logout"]);
AUTH_OPEN_PATHS.add("/api/auth/me");

// ------------------------------
// Public + auth routes
// ------------------------------

// Auth routes
app.post("/api/auth/login", async(req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res
            .status(400)
            .json({ error: "Tên đăng nhập và Mật khẩu là bắt buộc" });
    }
    const normalizedUsername = String(username).trim().toLowerCase();

    // Emergency fallback: allow env-based login if configured
    const fallbackUser = (process.env.DEFAULT_ADMIN_USER || "")
        .trim()
        .toLowerCase();
    const fallbackPass = (process.env.DEFAULT_ADMIN_PASS || "").trim();
    if (
        fallbackUser &&
        fallbackPass &&
        normalizedUsername === fallbackUser &&
        password === fallbackPass
    ) {
        req.session.user = { id: -1, username, role: "admin" };
        return res.json({ user: req.session.user, fallback: true });
    }

    try {
        const result = await pool.query(
            `
        SELECT ${quoteIdent(USERS_COLS.userId)} AS userid, ${quoteIdent(USERS_COLS.username)} AS username, ${quoteIdent(USERS_COLS.passwordHash)} AS passwordhash, ${quoteIdent(USERS_COLS.role)} AS role
        FROM ${DB_SCHEMA}.users
        WHERE LOWER(${quoteIdent(USERS_COLS.username)}) = $1
        LIMIT 1;
      `, [normalizedUsername]
        );
        if (!result.rows.length) {
            return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
        }
        const user = result.rows[0];
        const storedHash = user.passwordhash;
        const hashString =
            storedHash instanceof Buffer ?
            storedHash.toString() :
            String(storedHash || "");
        let isMatch = false;
        if (hashString.startsWith("$2")) {
            isMatch = await bcrypt.compare(password, hashString);
        } else {
            // Fallback: plain-text match for legacy rows
            isMatch = password === hashString || password === hashString.trim();
        }
        if (!isMatch) {
            return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
        }
        req.session.user = {
            id: user.userid,
            username: user.username,
            role: user.role || "user",
        };
        res.json({ user: req.session.user });
    } catch (error) {
        console.error("Đăng Nhập Thất Bại:", error);
        res
            .status(500)
            .json({ error: "Không thể đăng nhập, vui lòng thử lại sau" });
    }
});

app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
        req.session.destroy(() => {
            res.clearCookie(process.env.SESSION_NAME || "mavryk.sid");
            res.json({ success: true });
        });
    } else {
        res.json({ success: true });
    }
});

app.get("/api/auth/me", (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: "Không có quyền truy cập" });
    }
    res.json({ user: req.session.user });
});

// ------------------------------
// Auth guard middleware
// ------------------------------
// Protect all API routes except auth
app.use((req, res, next) => {
    if (AUTH_OPEN_PATHS.has(req.path) || req.path.startsWith("/api/auth/")) {
        return next();
    }
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: "Không có quyền truy cập" });
    }
    return next();
});

// ------------------------------
// DB pool & admin bootstrap
// ------------------------------
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Create a default admin user from env (useful for first-run or legacy data)
const ensureDefaultAdmin = async() => {
    const usernameEnv = (process.env.DEFAULT_ADMIN_USER || "").trim();
    const passwordEnv = (process.env.DEFAULT_ADMIN_PASS || "").trim();
    if (!usernameEnv || !passwordEnv) return;

    const client = await pool.connect();
    try {
        const normalizedUsername = usernameEnv.toLowerCase();
        const userIdCol = quoteIdent(USERS_COLS.userId);
        const usernameCol = quoteIdent(USERS_COLS.username);
        const passwordHashCol = quoteIdent(USERS_COLS.passwordHash);
        const roleCol = quoteIdent(USERS_COLS.role);
        const existing = await client.query(
            `SELECT ${userIdCol} FROM ${DB_SCHEMA}.users WHERE LOWER(${usernameCol}) = $1 LIMIT 1`, [normalizedUsername]
        );
        if (existing.rows.length) {
            return;
        }
        await client.query(
            `INSERT INTO ${DB_SCHEMA}.users (${usernameCol}, ${passwordHashCol}, ${roleCol}) VALUES ($1, $2, $3)`, [usernameEnv, await bcrypt.hash(passwordEnv, 10), "admin"]
        );
        console.log(`[AUTH] Đã tạo người dùng quản trị '${usernameEnv}'`);
    } catch (err) {
        console.error("[AUTH] Lỗi khi tạo Admin:", err);
    } finally {
        client.release();
    }
};

ensureDefaultAdmin().catch((err) =>
    console.error("[AUTH] ensureDefaultAdmin failed:", err)
);

// ------------------------------
// Auth routes
// ------------------------------

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
        const result = await client.query(detectionQuery, [
            SUPPLY_STATUS_CANDIDATES,
        ]);
        supplyStatusColumnNameCache =
            result && result.rows && result.rows[0] && result.rows[0].column_name ?
            result.rows[0].column_name :
            null;
    } catch (error) {
        console.warn(
            "Không tìm được cột trạng thái nhà cung cấp:",
            error.message || error
        );
        supplyStatusColumnNameCache = null;
    } finally {
        supplyStatusColumnResolved = true;
        client.release();
    }
    return supplyStatusColumnNameCache;
};

const packageProductCols = {
    id: quoteIdent(PACKAGE_PRODUCT_COLS.id),
    package: quoteIdent(PACKAGE_PRODUCT_COLS.package),
    username: quoteIdent(PACKAGE_PRODUCT_COLS.username),
    password: quoteIdent(PACKAGE_PRODUCT_COLS.password),
    mail2nd: quoteIdent(PACKAGE_PRODUCT_COLS.mail2nd),
    note: quoteIdent(PACKAGE_PRODUCT_COLS.note),
    supplier: quoteIdent(PACKAGE_PRODUCT_COLS.supplier),
    importPrice: quoteIdent(PACKAGE_PRODUCT_COLS.importPrice),
    slot: quoteIdent(PACKAGE_PRODUCT_COLS.slot),
    expired: quoteIdent(PACKAGE_PRODUCT_COLS.expired),
    match: quoteIdent(PACKAGE_PRODUCT_COLS.match),
};
const accountStorageCols = {
    id: quoteIdent(ACCOUNT_STORAGE_COLS.id),
    username: quoteIdent(ACCOUNT_STORAGE_COLS.username),
    password: quoteIdent(ACCOUNT_STORAGE_COLS.password),
    mail2nd: quoteIdent(ACCOUNT_STORAGE_COLS.mail2nd),
    note: quoteIdent(ACCOUNT_STORAGE_COLS.note),
    storage: quoteIdent(ACCOUNT_STORAGE_COLS.storage),
    mailFamily: quoteIdent(ACCOUNT_STORAGE_COLS.mailFamily),
};
const paymentSupplyCols = {
    id: quoteIdent(PAYMENT_SUPPLY_COLS.id),
    sourceId: quoteIdent(PAYMENT_SUPPLY_COLS.sourceId),
    importValue: quoteIdent(PAYMENT_SUPPLY_COLS.importValue),
    round: quoteIdent(PAYMENT_SUPPLY_COLS.round),
    status: quoteIdent(PAYMENT_SUPPLY_COLS.status),
    paid: quoteIdent(PAYMENT_SUPPLY_COLS.paid),
};
const supplyCols = {
    id: quoteIdent(SUPPLY_COLS.id),
    sourceName: quoteIdent(SUPPLY_COLS.sourceName),
    numberBank: quoteIdent(SUPPLY_COLS.numberBank),
    binBank: quoteIdent(SUPPLY_COLS.binBank),
    activeSupply: quoteIdent(SUPPLY_COLS.activeSupply),
};
const bankListCols = {
    bin: quoteIdent(BANK_LIST_COLS.bin),
    bankName: quoteIdent(BANK_LIST_COLS.bankName),
};
const supplyPriceCols = {
    id: quoteIdent(SUPPLY_PRICE_COLS.id),
    productId: quoteIdent(SUPPLY_PRICE_COLS.productId),
    sourceId: quoteIdent(SUPPLY_PRICE_COLS.sourceId),
    price: quoteIdent(SUPPLY_PRICE_COLS.price),
};
const productDescCols = {
    id: quoteIdent(PRODUCT_DESC_COLS.id),
    productId: quoteIdent(PRODUCT_DESC_COLS.productId),
    rules: quoteIdent(PRODUCT_DESC_COLS.rules),
    description: quoteIdent(PRODUCT_DESC_COLS.description),
    imageUrl: quoteIdent(PRODUCT_DESC_COLS.imageUrl),
};

const PACKAGE_PRODUCTS_SELECT = `
  SELECT
    pp.${packageProductCols.id} AS package_id,
    pp.${packageProductCols.package} AS package_name,
    pp.${packageProductCols.username} AS package_username,
    pp.${packageProductCols.password} AS package_password,
    pp.${packageProductCols.mail2nd} AS package_mail_2nd,
    pp.${packageProductCols.note} AS package_note,
    pp.${packageProductCols.supplier} AS package_supplier,
    pp.${packageProductCols.importPrice} AS package_import,
    pp.${packageProductCols.slot} AS package_slot,
    pp.${packageProductCols.expired} AS package_expired,
    pp.${packageProductCols.expired}::text AS package_expired_raw,
    pp.${packageProductCols.match} AS package_match,
    acc.${accountStorageCols.id} AS account_id,
    acc.${accountStorageCols.username} AS account_username,
    acc.${accountStorageCols.password} AS account_password,
    acc.${accountStorageCols.mail2nd} AS account_mail_2nd,
    acc.${accountStorageCols.note} AS account_note,
    acc.${accountStorageCols.storage} AS account_storage,
    acc.${accountStorageCols.mailFamily} AS account_mail_family,
    COALESCE(product_codes.product_codes, ARRAY[]::text[]) AS package_products
  FROM mavryk.package_product pp
  LEFT JOIN mavryk.account_storage acc
    ON acc.${accountStorageCols.mailFamily} = pp.${packageProductCols.username}
  LEFT JOIN (
    SELECT
      LOWER(TRIM(${quoteIdent(PRODUCT_PRICE_COLS.package)}::text)) AS package_key,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(TRIM(${quoteIdent(PRODUCT_PRICE_COLS.product)}::text), '')), NULL) AS product_codes
    FROM mavryk.product_price
    GROUP BY LOWER(TRIM(${quoteIdent(PRODUCT_PRICE_COLS.package)}::text))
  ) product_codes ON product_codes.package_key = LOWER(TRIM(pp.${packageProductCols.package}::text))
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
const ORDER_ID_COL = quoteIdent(ORDER_COLS.id);
const ORDER_DATE_COL = quoteIdent(ORDER_COLS.orderDate);
const ORDER_EXPIRED_COL = quoteIdent(ORDER_COLS.orderExpired);
const ORDER_COST_COL = quoteIdent(ORDER_COLS.cost);
const ORDER_PRICE_COL = quoteIdent(ORDER_COLS.price);

const dashStatsQuery = `
  WITH period_data AS (
    SELECT
      ${ORDER_ID_COL},
      CASE
        WHEN TRIM(${ORDER_DATE_COL}::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
          THEN TO_DATE(TRIM(${ORDER_DATE_COL}::text), 'DD/MM/YYYY')
        WHEN TRIM(${ORDER_DATE_COL}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          THEN TRIM(${ORDER_DATE_COL}::text)::date
        ELSE NULL
      END AS registration_date,
      CASE
        WHEN TRIM(${ORDER_EXPIRED_COL}::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
          THEN TO_DATE(TRIM(${ORDER_EXPIRED_COL}::text), 'DD/MM/YYYY')
        WHEN TRIM(${ORDER_EXPIRED_COL}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          THEN TRIM(${ORDER_EXPIRED_COL}::text)::date
        ELSE NULL
      END AS expiry_date,
      COALESCE(${ORDER_COST_COL}, 0) AS cost_value,
      COALESCE(${ORDER_PRICE_COL}, 0) AS price_value
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
      WHEN registration_date BETWEEN $3::date AND $4::date THEN cost_value
      ELSE 0
    END), 0) AS total_imports_current,
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN $1::date AND $2::date THEN cost_value
      ELSE 0
    END), 0) AS total_imports_previous,
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN $3::date AND $4::date THEN (price_value - cost_value)
      ELSE 0
    END), 0) AS total_profit_current,
    COALESCE(SUM(CASE
      WHEN registration_date BETWEEN $1::date AND $2::date THEN (price_value - cost_value)
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
            error: "Không thể tải số liệu dashboard.",
        });
    }
});

app.get("/api/dashboard/years", async(_req, res) => {
    console.log("[GET] /api/dashboard/years");
    const q = `
    WITH all_dates AS (
      SELECT order_date::text AS raw_date FROM ${DB_SCHEMA}.order_list
      UNION ALL
      SELECT order_date::text AS raw_date FROM ${DB_SCHEMA}.order_expired
      UNION ALL
      SELECT createdate::text AS raw_date FROM ${DB_SCHEMA}.order_canceled
      UNION ALL
      SELECT ${quoteIdent(PAYMENT_RECEIPT_COLS.paidDate)}::text AS raw_date FROM ${DB_SCHEMA}.payment_receipt
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
            error: "Không thể tải danh sách các năm.",
        });
    }
});

app.get("/api/dashboard/charts", async(req, res) => {
    console.log("[GET] /api/dashboard/charts");
    const currentYear = new Date().getFullYear();
    const filterYear = req.query.year ? Number(req.query.year) : currentYear;

    const orderDateCase = createDateNormalization("order_date");
    const orderYearCase = createYearExtraction("order_date");
    const receiptDateCase = createDateNormalization(
        quoteIdent(PAYMENT_RECEIPT_COLS.paidDate)
    );
    const receiptYearCase = createYearExtraction(
        quoteIdent(PAYMENT_RECEIPT_COLS.paidDate)
    );
    const refundDateCase = createDateNormalization("createdate");
    const refundYearCase = createYearExtraction("createdate");

    const q = `
    WITH all_orders AS (
      SELECT
        ${orderDateCase} AS order_date,
        ${orderYearCase} AS order_year,
        0 AS revenue_value,
        FALSE AS is_canceled
      FROM mavryk.order_list
      WHERE TRIM(order_date::text) <> ''
      UNION ALL
      SELECT
        ${orderDateCase} AS order_date,
        ${orderYearCase} AS order_year,
        0 AS revenue_value,
        FALSE AS is_canceled
      FROM mavryk.order_expired
      WHERE TRIM(order_date::text) <> ''
      UNION ALL
      SELECT
        ${createDateNormalization("createdate")} AS order_date,
        ${createYearExtraction("createdate")} AS order_year,
        0 AS revenue_value,
        TRUE AS is_canceled
      FROM mavryk.order_canceled
      WHERE TRIM(createdate::text) <> ''
    ),
    filtered_orders AS (
      SELECT *
      FROM all_orders
      WHERE order_date IS NOT NULL
        AND order_year = $1
    ),
    order_counts AS (
      SELECT
        EXTRACT(MONTH FROM order_date) AS month_num,
        TO_CHAR(order_date, '"T"FM9') AS month_label,
        COUNT(*) AS total_orders,
        COALESCE(SUM(CASE WHEN is_canceled THEN 1 ELSE 0 END), 0) AS total_canceled
      FROM filtered_orders
      GROUP BY 1, 2
      ORDER BY 1
    ),
    receipts AS (
      SELECT
        ${receiptDateCase} AS receipt_date,
        ${receiptYearCase} AS receipt_year,
        COALESCE(${quoteIdent(PAYMENT_RECEIPT_COLS.amount)}, 0) AS amount_value
      FROM ${DB_SCHEMA}.payment_receipt
      WHERE TRIM(${quoteIdent(PAYMENT_RECEIPT_COLS.paidDate)}::text) <> ''
    ),
    refunds AS (
      SELECT
        ${refundDateCase} AS refund_date,
        ${refundYearCase} AS refund_year,
        COALESCE(refund, 0) AS refund_value
      FROM ${DB_SCHEMA}.order_canceled
      WHERE TRIM(createdate::text) <> ''
    ),
    revenue_events AS (
      SELECT receipt_date AS event_date, receipt_year AS event_year, amount_value AS value
      FROM receipts
      UNION ALL
      SELECT refund_date, refund_year, -1 * refund_value AS value
      FROM refunds
    ),
    filtered_revenue AS (
      SELECT *
      FROM revenue_events
      WHERE event_date IS NOT NULL AND event_year = $1
    ),
    monthly_revenue AS (
      SELECT
        EXTRACT(MONTH FROM event_date) AS month_num,
        TO_CHAR(event_date, '"T"FM9') AS month_label,
        COALESCE(SUM(value), 0) AS total_sales
      FROM filtered_revenue
      GROUP BY 1, 2
      ORDER BY 1
    ),
    monthly_stats AS (
      SELECT
        COALESCE(oc.month_num, mr.month_num) AS month_num,
        COALESCE(oc.month_label, mr.month_label) AS month_label,
        COALESCE(mr.total_sales, 0) AS total_sales,
        COALESCE(oc.total_orders, 0) AS total_orders,
        COALESCE(oc.total_canceled, 0) AS total_canceled
      FROM order_counts oc
      FULL OUTER JOIN monthly_revenue mr
        ON oc.month_num = mr.month_num
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
            error: "Không thể tải dữ liệu biểu đồ.",
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

const trimToLength = (value, maxLength = 255) => {
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    if (!str) return null;
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength);
};

const normalizeMultiplier = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1.0;
};

const computeRoundedPriceFromSupply = (
    basePrice,
    pctCtv,
    pctKhach,
    isWholesale
) => {
    if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
    let price = basePrice * normalizeMultiplier(pctCtv);
    if (!isWholesale) {
        price *= normalizeMultiplier(pctKhach);
    }
    return roundToNearestThousand(Helpers.roundGiaBanValue(Math.max(0, price)));
};

const computePromoPriceFromSupply = (basePrice, pctCtv, pctKhach, pctPromo) => {
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
        update: row.update instanceof Date ? row.update.toISOString() : row.update,
        computed_wholesale_price: computedWholesalePrice,
        computed_retail_price: computedRetailPrice,
        computed_promo_price: computedPromoPrice,
        promo_price: computedPromoPrice,
        max_supply_price: baseSupplyPrice,
    };
};

const mapProductDescRow = (row) => {
    if (!row) return null;
    const productId = (row.product_id || "").trim();
    const imageUrl =
        typeof row.image_url === "string" && row.image_url.trim()
            ? row.image_url.trim()
            : null;
    return {
        id: Number(row.id) || 0,
        productId,
        productName: (row.product_name || "").trim() || null,
        rules: (row.rules || "").trim(),
        description: (row.description || "").trim(),
        imageUrl,
    };
};

const mapPostgresErrorToMessage = (error) => {
    if (!error) return null;
    switch (error.code) {
        case "23505":
            return "Mã Sản Phẩm Đã Tồn Tại, Vui Lòng Chọn Mã Sản Phẩm Khác";
        case "22P02":
            return "Tỷ Lệ Giá Phải Là Số Hợp Lệ";
        case "23503":
            return "Không thể cập nhật sản phẩm do dữ liệu liên quan không hợp lệ.";
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
    SELECT ${supplyCols.id} AS id
    FROM mavryk.supply
    WHERE LOWER(TRIM(${supplyCols.sourceName}::text)) = $1
    ORDER BY ${supplyCols.id} ASC
    LIMIT 1;
  `, [normalized]
    );
    return result && result.rows && result.rows[0] && result.rows[0].id ?
        result.rows[0].id :
        null;
};

const parsePositiveNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
};

const resolveOrderTypeLabel = (idOrder, customerType) => {
    const normalizedType = String(customerType || "")
        .trim()
        .toUpperCase();
    const allPrefixes = new Set(
        Object.values(ORDER_PREFIXES).map((p) => String(p || "").toUpperCase())
    );
    if (allPrefixes.has(normalizedType)) {
        return normalizedType;
    }

    const normalizedId = String(idOrder || "")
        .trim()
        .toUpperCase();
    for (const prefix of allPrefixes) {
        if (normalizedId.startsWith(prefix)) {
            return prefix;
        }
    }
    return null;
};

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const calculateOrderPriceFromRule = async({ productName, supplyId, supplyName, idOrder, customerType },
    clientOverride = null
) => {
    const client = clientOverride || (await pool.connect());
    const shouldRelease = !clientOverride;
    try {
        const normalizedProduct = normalizeTextInput(productName);
        if (!normalizedProduct) {
            throw createHttpError(
                400,
                "Product (san_pham) is required to calculate price."
            );
        }

        const orderType = resolveOrderTypeLabel(idOrder, customerType);
        if (!orderType) {
            throw createHttpError(
                400,
                "Cannot determine order type (MAVC/MAVL/MAVT) from id_order or customer_type."
            );
        }

        const productResult = await client.query(
            `
      SELECT ${quoteIdent(PRODUCT_PRICE_COLS.id)} AS id,
             ${quoteIdent(PRODUCT_PRICE_COLS.pctCtv)} AS pct_ctv,
             ${quoteIdent(PRODUCT_PRICE_COLS.pctKhach)} AS pct_khach
      FROM ${DB_SCHEMA}.product_price
      WHERE ${quoteIdent(PRODUCT_PRICE_COLS.product)} = $1
      LIMIT 1;
    `, [normalizedProduct]
        );
        if (!productResult.rows.length) {
            throw createHttpError(
                404,
                "Product not found in product_price table."
            );
        }
        const productRow = productResult.rows[0];
        const productId = Number(productRow.id);
        if (!Number.isFinite(productId) || productId <= 0) {
            throw createHttpError(
                400,
                "Product is missing a valid id in product_price."
            );
        }
        const pctCtvRaw = Number(productRow.pct_ctv);
        const pctKhachRaw = Number(productRow.pct_khach);
        const pctCtv =
            Number.isFinite(pctCtvRaw) && pctCtvRaw > 0 ? pctCtvRaw : null;
        const pctKhach =
            Number.isFinite(pctKhachRaw) && pctKhachRaw > 0 ? pctKhachRaw : null;

        let resolvedSupplyId = parsePositiveNumber(supplyId);
        const normalizedSupplyName = normalizeTextInput(supplyName);
        if (!resolvedSupplyId && normalizedSupplyName) {
            resolvedSupplyId = await findSupplyIdByName(client, normalizedSupplyName);
        }
        if (!resolvedSupplyId) {
            throw createHttpError(
                400,
                "Source (nguon) is required to calculate price."
            );
        }

        const supplyPriceResult = await client.query(
            `
      SELECT ${quoteIdent(SUPPLY_PRICE_COLS.price)} AS price
      FROM ${DB_SCHEMA}.supply_price
      WHERE ${quoteIdent(SUPPLY_PRICE_COLS.productId)} = $1
        AND ${quoteIdent(SUPPLY_PRICE_COLS.sourceId)} = $2
      LIMIT 1;
    `, [productId, resolvedSupplyId]
        );

        if (!supplyPriceResult.rows.length) {
            throw createHttpError(
                404,
                "No supply_price entry found for this product and source."
            );
        }

        const baseSupplyPrice = Number(supplyPriceResult.rows[0].price);
        if (!Number.isFinite(baseSupplyPrice) || baseSupplyPrice <= 0) {
            throw createHttpError(
                400,
                "Supply price is missing or invalid for this product/source."
            );
        }

        if ((orderType === "MAVC" || orderType === "MAVL") && pctCtv === null) {
            throw createHttpError(
                400,
                "pct_ctv must be configured for this product."
            );
        }
        if (orderType === "MAVL" && pctKhach === null) {
            throw createHttpError(
                400,
                "pct_khach must be configured for MAVL orders."
            );
        }

        const effectivePctCtv = pctCtv ?? 1.0;
        const effectivePctKhach = pctKhach ?? 1.0;

        let computedPrice = baseSupplyPrice;
        if (orderType === "MAVC") {
            computedPrice = baseSupplyPrice * effectivePctCtv;
        } else if (orderType === "MAVL") {
            computedPrice = baseSupplyPrice * effectivePctCtv * effectivePctKhach;
        }

        const roundedCost = roundToNearestThousand(
            Helpers.roundGiaBanValue(baseSupplyPrice)
        );
        const roundedPrice = roundToNearestThousand(
            Helpers.roundGiaBanValue(Math.max(0, computedPrice))
        );

        const months = Helpers.monthsFromString(normalizedProduct);
        const days = Helpers.daysFromMonths(months) || 30;

        return {
            cost: Math.max(0, roundedCost),
            price: Math.max(0, roundedPrice),
            days: Number(days),
            order_expired: "",
        };
    } finally {
        if (shouldRelease) {
            client.release();
        }
    }
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

const normalizeStatusKey = (value) => {
    if (value === undefined || value === null) return "";
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/gi, "")
        .toLowerCase();
};

const normalizeOrderRow = (row, todayYmd = todayYMDInVietnam()) => {
    const registrationRaw =
        row.order_date_raw ??
        row.order_date;
    const expiryRaw =
        row.order_expired_raw ??
        row.order_expired;

    const registrationYmd = normalizeRawToYMD(registrationRaw);
    const expiryYmd = normalizeRawToYMD(expiryRaw);
    const remainingDays =
        expiryYmd && todayYmd ? diffDaysYMD(expiryYmd, todayYmd) : null;
    const backendRemaining =
        row.days !== undefined && row.days !== null ?
        Number(row.days) :
        null;
    const soNgayConLai =
        Number.isFinite(remainingDays) && remainingDays !== null ?
        remainingDays :
        Number.isFinite(backendRemaining) ?
        backendRemaining :
        null;

    const dbStatusRaw =
        typeof row.status === "string" ?
        row.status.trim() :
        "";
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
        status: finalStatus,
        status_auto: autoStatus,
        check_flag: finalCheckFlag,
        check_flag_auto: autoCheckFlag,
    };
};

const ORDER_WRITABLE_COLUMNS = new Set([
    ORDER_COLS.idOrder,
    ORDER_COLS.idProduct,
    ORDER_COLS.informationOrder,
    ORDER_COLS.customer,
    ORDER_COLS.contact,
    ORDER_COLS.slot,
    ORDER_COLS.orderDate,
    ORDER_COLS.days,
    ORDER_COLS.orderExpired,
    ORDER_COLS.supply,
    ORDER_COLS.cost,
    ORDER_COLS.price,
    ORDER_COLS.note,
    ORDER_COLS.status,
    ORDER_COLS.checkFlag,
]);

const sanitizeOrderWritePayload = (raw = {}) => {
    const sanitized = {};
    Object.entries(raw || {}).forEach(([key, value]) => {
        const mappedKey = key;
        if (!ORDER_WRITABLE_COLUMNS.has(mappedKey)) {
            return;
        }

        let normalizedValue = value;
        if (
            mappedKey === ORDER_COLS.orderDate ||
            mappedKey === ORDER_COLS.orderExpired
        ) {
            normalizedValue = normalizeDateInput(value);
        } else if (
            mappedKey === ORDER_COLS.cost ||
            mappedKey === ORDER_COLS.price
        ) {
            normalizedValue =
                value === undefined || value === null || value === "" ?
                null :
                toNullableNumber(value);
        } else if (mappedKey === ORDER_COLS.days) {
            if (
                value === undefined ||
                value === null ||
                String(value).trim() === ""
            ) {
                normalizedValue = null;
            } else {
                const parsedDays = Number(value);
                normalizedValue = Number.isFinite(parsedDays) ? parsedDays : value;
            }
        } else if (mappedKey === ORDER_COLS.checkFlag) {
            normalizedValue = normalizeCheckFlagValue(value);
        } else if (typeof value === "string") {
            normalizedValue = value.trim();
        }

        sanitized[mappedKey] = normalizedValue;
    });

    return sanitized;
};
const ARCHIVE_COLUMNS_COMMON = [
    ORDER_COLS.id,
    ORDER_COLS.idOrder,
    ORDER_COLS.idProduct,
    ORDER_COLS.informationOrder,
    ORDER_COLS.customer,
    ORDER_COLS.contact,
    ORDER_COLS.slot,
    ORDER_COLS.orderDate,
    ORDER_COLS.days,
    ORDER_COLS.orderExpired,
    ORDER_COLS.supply,
    ORDER_COLS.cost,
    ORDER_COLS.price,
];
const ARCHIVE_COLUMNS_EXPIRED = [
    ...ARCHIVE_COLUMNS_COMMON,
    ORDER_COLS.note,
    ORDER_COLS.status,
    ORDER_COLS.checkFlag,
    "archived_at",
];
const ARCHIVE_COLUMNS_CANCELED = [
    ...ARCHIVE_COLUMNS_COMMON,
    ORDER_COLS.refund,
    ORDER_COLS.status,
    ORDER_COLS.checkFlag,
    "createdate",
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

const fetchOrdersFromTable = async(tableName) => {
    const isCanceled = tableName.includes("order_canceled");
    const orderDateCol = quoteIdent(ORDER_COLS.orderDate);
    const orderExpiredCol = quoteIdent(ORDER_COLS.orderExpired);
    const baseSelect = `
    ${quoteIdent(ORDER_COLS.id)},
    ${quoteIdent(ORDER_COLS.idOrder)},
    ${quoteIdent(ORDER_COLS.idProduct)},
    ${quoteIdent(ORDER_COLS.informationOrder)},
    ${quoteIdent(ORDER_COLS.customer)},
    ${quoteIdent(ORDER_COLS.contact)},
    ${quoteIdent(ORDER_COLS.slot)},
    ${orderDateCol},
    ${orderDateCol}::text AS order_date_raw,
    ${quoteIdent(ORDER_COLS.days)},
    ${orderExpiredCol},
    ${orderExpiredCol}::text AS order_expired_raw,
    ${quoteIdent(ORDER_COLS.supply)},
    ${quoteIdent(ORDER_COLS.cost)},
    ${quoteIdent(ORDER_COLS.price)},
  `;
    const selectColumns = isCanceled ?
        `${baseSelect}
    ${quoteIdent(ORDER_COLS.refund)},
    ${quoteIdent(ORDER_COLS.status)},
    ${quoteIdent(ORDER_COLS.checkFlag)}` :
        `${baseSelect}
    ${quoteIdent(ORDER_COLS.note)},
    ${quoteIdent(ORDER_COLS.status)},
    ${quoteIdent(ORDER_COLS.checkFlag)}`;
    const query = `
    SELECT
${selectColumns}
    FROM ${tableName};
  `;
    const result = await pool.query(query);
    const todayYmd = todayYMDInVietnam();
    return result.rows.map((row) => normalizeOrderRow(row, todayYmd));
};
app.get("/api/orders", async(req, res) => {
    console.log("[GET] /api/orders");
    const scope = String(req.query.scope || "")
        .trim()
        .toLowerCase();

    const table =
        scope === "expired" ?
        "mavryk.order_expired" :
        scope === "canceled" || scope === "cancelled" ?
        "mavryk.order_canceled" :
        "mavryk.order_list";

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

app.post("/api/orders/:orderCode/renew", async(req, res) => {
    const orderCode = String(req.params.orderCode || "").trim();
    const forceRenewal = req.body?.forceRenewal ?? req.body?.force ?? true;
    console.log(`[POST] /api/orders/${orderCode}/renew`, {
        forceRenewal,
        body: req.body,
    });

    if (!orderCode) {
        return res.status(400).json({ error: "Missing order code." });
    }
    if (typeof sepayWebhookApp.runRenewal !== "function") {
        return res.status(500).json({ error: "Renewal service unavailable." });
    }

    try {
        const result = await sepayWebhookApp.runRenewal(orderCode, {
            forceRenewal: forceRenewal !== false,
        });
        console.log("[Renewal] result", {
            orderCode,
            success: result?.success,
            processType: result?.processType,
            details: result?.details,
        });
        if (result?.success) {
            try {
                if (typeof sepayWebhookApp.sendRenewalNotification === "function") {
                    await sepayWebhookApp.sendRenewalNotification(orderCode, result);
                    console.log("[Renewal] Telegram notification sent", { orderCode });
                }
            } catch (notifyErr) {
                console.error("[Renewal] Telegram notification failed:", notifyErr);
            }
            return res.json(result);
        }
        const statusCode = result?.processType === "skipped" ? 409 : 400;
        return res.status(statusCode).json({
            error: result?.details || "Renewal failed",
            result,
        });
    } catch (error) {
        console.error(
            `[POST] /api/orders/${orderCode}/renew failed:`,
            error
        );
        return res.status(500).json({ error: "Unable to renew order." });
    }
});

app.get("/api/orders/expired", async(_req, res) => {
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

app.get("/api/orders/canceled", async(_req, res) => {
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

app.patch("/api/orders/canceled/:id/refund", async(req, res) => {
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
        SET status = 'Đã Hoàn',
            check_flag = FALSE
        WHERE id = $1
        RETURNING id, id_order;
      `, [parsedId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: "Canceled order not found." });
        }

        res.json({
            success: true,
            id: parsedId,
            id_order: result.rows[0].id_order,
            status: "Đã Hoàn",
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
            try {
                const orderListCols = {
                    orderDateCol: ORDER_COLS.orderDate,
                    sourceCol: ORDER_COLS.supply,
                    costCol: ORDER_COLS.cost,
                };
                const orderExpiredCols = orderListCols;
                const orderCanceledCols = {
                    orderDateCol: "createdate",
                    sourceCol: ORDER_COLS.supply,
                    costCol: ORDER_COLS.cost,
                };
                const statusColumnName = await resolveSupplyStatusColumn();
                const paymentStatusKey = createVietnameseStatusKey("ps.status");
                const statusSelect = statusColumnName ?
                    `s."${statusColumnName}"::text AS raw_status` :
                    "NULL AS raw_status";

                const makeOrderSelect = (table, cols) => {
                    const orderDateExpr = createDateNormalization(
                        quoteIdent(cols.orderDateCol)
                    );
                    const sourceKeyExpr = createSourceKey(quoteIdent(cols.sourceCol));
                    const importExpr = createNumericExtraction(quoteIdent(cols.costCol));
                    const sourceIdent = quoteIdent(cols.sourceCol);
                    return `
      SELECT
        ${orderDateExpr} AS order_date,
        COALESCE(${sourceKeyExpr}, '') AS source_key,
        TRIM(${sourceIdent}::text) AS source_name,
        ${importExpr} AS import_value
      FROM ${DB_SCHEMA}.${table}
      WHERE TRIM(${sourceIdent}::text) <> ''
    `;
                };

                const ordersUnion = `
    WITH orders_union AS (
${makeOrderSelect("order_list", orderListCols)}
      UNION ALL
${makeOrderSelect("order_expired", orderExpiredCols)}
      UNION ALL
${makeOrderSelect("order_canceled", orderCanceledCols)}
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
      FROM ${DB_SCHEMA}.supply_price sp
      JOIN ${DB_SCHEMA}.product_price pp ON sp.product_id = pp.id
      GROUP BY sp.source_id
    ),
    payment_summary AS (
      SELECT
        ps.${paymentSupplyCols.sourceId},
        SUM(COALESCE(ps.${paymentSupplyCols.paid}, 0)) AS total_paid_import,
        SUM(
          CASE
            WHEN ${createVietnameseStatusKey(
                `ps.${paymentSupplyCols.status}`
            )} = 'chua thanh toan'
              THEN GREATEST(
                COALESCE(ps.${paymentSupplyCols.importValue}, 0) - COALESCE(ps.${paymentSupplyCols.paid}, 0),
                0
              )
            ELSE 0
          END
        ) AS total_unpaid_import
      FROM ${DB_SCHEMA}.payment_supply ps
      GROUP BY ps.${paymentSupplyCols.sourceId}
    )
    SELECT
      s.${supplyCols.id} AS id,
      s.${supplyCols.sourceName} AS source_name,
      s.${supplyCols.numberBank} AS number_bank,
      s.${supplyCols.binBank} AS bin_bank,
      ${statusSelect},
      COALESCE(bl.${bankListCols.bankName}, '') AS bank_name,
      COALESCE(product_data.product_list, ARRAY[]::text[]) AS product_names,
      COALESCE(month_data.monthly_orders, 0) AS monthly_orders,
      COALESCE(month_data.monthly_import_value, 0) AS monthly_import_value,
      COALESCE(last_order.last_order_date, NULL) AS last_order_date,
      COALESCE(total_data.total_orders, 0) AS total_orders,
      COALESCE(payment_summary.total_paid_import, 0) AS total_paid_import,
      COALESCE(payment_summary.total_unpaid_import, 0) AS total_unpaid_import
    FROM ${DB_SCHEMA}.supply s
    LEFT JOIN product_data ON product_data.source_id = s.${supplyCols.id}
    LEFT JOIN month_data
      ON month_data.source_key = ${createSourceKey(`s.${supplyCols.sourceName}`)}
    LEFT JOIN last_order
      ON last_order.source_key = ${createSourceKey(`s.${supplyCols.sourceName}`)}
    LEFT JOIN total_data
      ON total_data.source_key = ${createSourceKey(`s.${supplyCols.sourceName}`)}
    LEFT JOIN payment_summary
      ON payment_summary.source_id = s.${supplyCols.id}
    LEFT JOIN ${DB_SCHEMA}.bank_list bl
      ON TRIM(bl.${bankListCols.bin}::text) = TRIM(s.${supplyCols.binBank}::text)
    ORDER BY s.${supplyCols.sourceName};
  `;

        const result = await pool.query(ordersUnion, [monthStart, nextMonthStart]);
        const rows = result.rows || [];
        const supplies = rows.map((row) => {
            const normalizedStatus = normalizeSupplyStatus(row.raw_status);
            const isActive = normalizedStatus !== "inactive";
            const totalUnpaidRaw = Number(row.total_unpaid_import) || 0;
            const totalUnpaidImport = totalUnpaidRaw < 0 ? 0 : totalUnpaidRaw;
            return {
                id: row.id,
                sourceName: row.source_name || "",
                numberBank: row.number_bank || null,
                binBank: row.bin_bank || null,
                bankName: row.bank_name || null,
                status: normalizedStatus || "inactive",
                rawStatus: row.raw_status || null,
                isActive,
                products: Array.isArray(row.product_names) ? row.product_names : [],
                monthlyOrders: Number(row.monthly_orders) || 0,
                monthlyImportValue: Number(row.monthly_import_value) || 0,
                lastOrderDate: formatDateOutput(row.last_order_date),
                totalOrders: Number(row.total_orders) || 0,
                totalPaidImport: Number(row.total_paid_import) || 0,
                totalUnpaidImport,
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

app.get("/api/supplies", async(req, res) => {
    try {
        const result = await pool.query(
            `
      SELECT
        ${supplyCols.id} AS id,
        ${supplyCols.sourceName} AS source_name,
        ${supplyCols.numberBank} AS number_bank,
        ${supplyCols.binBank} AS bin_bank
      FROM ${DB_SCHEMA}.supply
      ORDER BY ${supplyCols.sourceName};
      `
        );
        res.json(result.rows || []);
    } catch (error) {
        console.error("Query failed (GET /api/supplies):", error);
        res.status(500).json({ error: "Unable to load suppliers." });
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
    const offset =
        Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;
    const limitPlusOne = limit + 1;
    const q = `
    SELECT
      ps.${paymentSupplyCols.id} AS id,
      ps.${paymentSupplyCols.sourceId} AS source_id,
      COALESCE(s.${supplyCols.sourceName}, '') AS source_name,
      COALESCE(ps.${paymentSupplyCols.importValue}, 0) AS import_value,
      COALESCE(ps.${paymentSupplyCols.paid}, 0) AS paid_value,
      COALESCE(ps.${paymentSupplyCols.round}, '') AS round_label,
      COALESCE(ps.${paymentSupplyCols.status}, '') AS status_label
    FROM mavryk.payment_supply ps
    LEFT JOIN mavryk.supply s ON s.${supplyCols.id} = ps.${paymentSupplyCols.sourceId}
    WHERE ps.${paymentSupplyCols.sourceId} = $1
    ORDER BY ps.${paymentSupplyCols.id} DESC
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
      INSERT INTO mavryk.payment_supply (${paymentSupplyCols.sourceId}, ${paymentSupplyCols.importValue}, ${paymentSupplyCols.paid}, ${paymentSupplyCols.round}, ${paymentSupplyCols.status})
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${paymentSupplyCols.id} AS id, ${paymentSupplyCols.sourceId} AS source_id, ${paymentSupplyCols.importValue} AS import, ${paymentSupplyCols.paid} AS paid, ${paymentSupplyCols.round} AS round, ${paymentSupplyCols.status} AS status;
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
    const offset =
        Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

    const query = `
    SELECT
      ${quoteIdent(PAYMENT_RECEIPT_COLS.id)} AS id,
      COALESCE(${quoteIdent(PAYMENT_RECEIPT_COLS.orderCode)}::text, '') AS ma_don_hang,
      COALESCE(${quoteIdent(PAYMENT_RECEIPT_COLS.paidDate)}::text, '') AS ngay_thanh_toan,
      COALESCE(${quoteIdent(PAYMENT_RECEIPT_COLS.amount)}, 0) AS so_tien,
      COALESCE(${quoteIdent(PAYMENT_RECEIPT_COLS.sender)}::text, '') AS nguoi_gui,
      COALESCE(${quoteIdent(PAYMENT_RECEIPT_COLS.note)}::text, '') AS noi_dung_ck
    FROM mavryk.payment_receipt
    ORDER BY
      NULLIF(${quoteIdent(PAYMENT_RECEIPT_COLS.paidDate)}::text, '') DESC NULLS LAST,
      ${quoteIdent(PAYMENT_RECEIPT_COLS.id)} DESC
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
    SELECT id, san_pham, package_product, package
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

app.get("/api/product-descriptions", async(req, res) => {
    console.log("[GET] /api/product-descriptions", req.query);
    const limitParam = Number.parseInt(req.query.limit, 10);
    const offsetParam = Number.parseInt(req.query.offset, 10);
    const search =
        typeof req.query.search === "string" ? req.query.search.trim() : "";

    const limit = Number.isFinite(limitParam) ?
        Math.min(Math.max(limitParam, 1), 200) :
        50;
    const offset =
        Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

    const params = [];
    let whereClause = "";
    if (search) {
        params.push(`%${search.toLowerCase()}%`);
        const searchIdx = params.length;
        whereClause = `
      WHERE (
        LOWER(COALESCE(pd.${productDescCols.productId}::text, '')) LIKE $${searchIdx}
        OR LOWER(COALESCE(pd.${productDescCols.rules}::text, '')) LIKE $${searchIdx}
        OR LOWER(COALESCE(pd.${productDescCols.description}::text, '')) LIKE $${searchIdx}
      )
    `;
    }

    params.push(offset);
    const offsetIdx = params.length;
    params.push(limit);
    const limitIdx = params.length;

    const query = `
    WITH raw AS (
      SELECT
        pd.${productDescCols.id} AS id,
        COALESCE(TRIM(pd.${productDescCols.productId}::text), '') AS product_id,
        COALESCE(TRIM(pd.${productDescCols.rules}::text), '') AS rules,
        COALESCE(TRIM(pd.${productDescCols.description}::text), '') AS description,
        COALESCE(NULLIF(TRIM(pd.${productDescCols.imageUrl}::text), ''), NULL) AS image_url,
        COALESCE(pp.san_pham::text, '') AS product_name
      FROM ${DB_SCHEMA}.product_desc pd
      LEFT JOIN ${DB_SCHEMA}.product_price pp
        ON (
          CASE
            WHEN TRIM(pd.${productDescCols.productId}::text) ~ '^\\d+$'
              THEN TRIM(pd.${productDescCols.productId}::text)::int
            ELSE NULL
          END
        ) = pp.id
        OR LOWER(TRIM(pd.${productDescCols.productId}::text)) = LOWER(TRIM(pp.san_pham::text))
      ${whereClause}
    )
    SELECT *, COUNT(*) OVER() AS total_count
    FROM raw
    ORDER BY id DESC
    OFFSET $${offsetIdx}
    LIMIT $${limitIdx};
  `;

    try {
        const result = await pool.query(query, params);
        const rows = result.rows || [];
        const items = rows.map(mapProductDescRow).filter((row) => row !== null);
        const totalCount =
            rows.length > 0 && Number.isFinite(Number(rows[0].total_count)) ?
            Number(rows[0].total_count) :
            items.length;
        res.json({
            items,
            count: items.length,
            total: totalCount,
            offset,
            limit,
        });
    } catch (error) {
        console.error("Query failed (GET /api/product-descriptions):", error);
        res.status(500).json({
            error: "Unable to load product descriptions.",
        });
    }
});

app.post("/api/product-descriptions", async(req, res) => {
    console.log("[POST] /api/product-descriptions");
    const { productId, rules, description, imageUrl } = req.body || {};

    const normalizedProductId = trimToLength(normalizeTextInput(productId), 255);
    const normalizedRules = trimToLength(rules, 255);
    const normalizedDescription = trimToLength(description, 255);
    const normalizedImageUrl = trimToLength(imageUrl, 255);

    if (!normalizedProductId) {
        return res.status(400).json({ error: "product_id is required." });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existing = await client.query(
            `
        SELECT ${productDescCols.id} AS id
        FROM ${DB_SCHEMA}.product_desc
        WHERE LOWER(TRIM(${productDescCols.productId}::text)) = LOWER(TRIM($1::text))
        LIMIT 1;
      `, [normalizedProductId]
        );

        if (existing.rows.length) {
            const currentId = existing.rows[0].id;
            const updateResult = await client.query(
                `
          UPDATE ${DB_SCHEMA}.product_desc
          SET ${productDescCols.productId} = $1,
              ${productDescCols.rules} = $2,
              ${productDescCols.description} = $3,
              ${productDescCols.imageUrl} = $4
          WHERE ${productDescCols.id} = $5
          RETURNING ${productDescCols.id} AS id,
                    ${productDescCols.productId} AS product_id,
                    ${productDescCols.rules} AS rules,
                    ${productDescCols.description} AS description,
                    ${productDescCols.imageUrl} AS image_url;
        `, [
                    normalizedProductId,
                    normalizedRules,
                    normalizedDescription,
                    normalizedImageUrl,
                    currentId,
                ]
            );
            await client.query("COMMIT");
            return res.json(mapProductDescRow(updateResult.rows[0]));
        }

        const nextId = await getNextProductDescId(client);
        const insertResult = await client.query(
            `
        INSERT INTO ${DB_SCHEMA}.product_desc
          (${productDescCols.id}, ${productDescCols.productId}, ${productDescCols.rules}, ${productDescCols.description}, ${productDescCols.imageUrl})
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${productDescCols.id} AS id,
                  ${productDescCols.productId} AS product_id,
                  ${productDescCols.rules} AS rules,
                  ${productDescCols.description} AS description,
                  ${productDescCols.imageUrl} AS image_url;
      `, [
                nextId,
                normalizedProductId,
                normalizedRules,
                normalizedDescription,
                normalizedImageUrl,
            ]
        );
        await client.query("COMMIT");
        return res.status(201).json(mapProductDescRow(insertResult.rows[0]));
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Mutation failed (POST /api/product-descriptions):", error);
        res.status(500).json({
            error: "Unable to save product description.",
        });
    } finally {
        client.release();
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
        const items = rows.map(mapDbProductPriceRow).filter((row) => row !== null);
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
        return res.status(400).json({ error: "MÃ£ sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng." });
    }
    if (pctCtvValue === null || pctCtvValue <= 0) {
        return res.status(400).json({ error: "Tá»· giÃ¡ CTV pháº£i lá»›n hÆ¡n 0." });
    }
    if (!pctKhachValue || pctKhachValue <= 0) {
        return res.status(400).json({ error: "Tá»· giÃ¡ KhÃ¡ch pháº£i lá»›n hÆ¡n 0." });
    }
    if (pctPromoValue !== null) {
        if (pctPromoValue < 0) {
            return res
                .status(400)
                .json({ error: "Tá»· giÃ¡ khuyáº¿n mÃ£i pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0." });
        }
        if (pctPromoValue >= pctKhachValue) {
            return res.status(400).json({
                error: "Tá»· giÃ¡ khuyáº¿n mÃ£i pháº£i nhá» hÆ¡n tá»· giÃ¡ khÃ¡ch.",
            });
        }
        if (pctKhachValue - pctPromoValue > 1) {
            return res.status(400).json({
                error: "GiÃ¡ khuyáº¿n mÃ£i khÃ´ng Ä‘Æ°á»£c vÆ°á»£t giÃ¡ sá»‰.",
            });
        }
    }
    if (supplierEntries.length === 0) {
        return res
            .status(400)
            .json({ error: "Cáº§n thÃªm Ã­t nháº¥t má»™t nhÃ  cung cáº¥p." });
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
            return res.status(500).json({ error: "KhÃ´ng thá»ƒ táº¡o sáº£n pháº©m má»›i." });
        }

        for (const supplier of supplierEntries) {
            const sourceName = normalizeTextInput(supplier?.sourceName);
            const numberBank = normalizeTextInput(supplier?.numberBank);
            const bankBin = normalizeTextInput(supplier?.bankBin);
            const priceValue = toNullableNumber(supplier?.price);
            const sourceIdFromPayload = toNullableNumber(supplier?.sourceId);

            if (!sourceName && !sourceIdFromPayload) {
                await client.query("ROLLBACK");
                return res
                    .status(400)
                    .json({ error: "Tên nguồn không được bỏ trống." });
            }
            if (!priceValue || priceValue <= 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: `Giá nhập cho nguồn ${sourceName || sourceIdFromPayload || ""} phải lớn hơn 0.`,
                });
            }

            // Nếu đã có sourceId, không yêu cầu ngân hàng/STK và không tạo supply mới.
            let supplyId = sourceIdFromPayload || null;
            if (!supplyId && sourceName) {
                supplyId = await findSupplyIdByName(client, sourceName);
            }

            // Chỉ tạo supply mới nếu chưa có; khi tạo mới mới yêu cầu bankBin.
            if (!supplyId) {
                if (!bankBin) {
                    await client.query("ROLLBACK");
                    return res
                        .status(400)
                        .json({ error: "Vui lòng chọn ngân hàng cho nguồn." });
                }
                const nextSupplyId = await getNextSupplyId(client);
                const statusColumn = await resolveSupplyStatusColumn();
                const fields = [
                    supplyCols.id,
                    supplyCols.sourceName,
                    supplyCols.numberBank,
                    supplyCols.binBank,
                ];
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
                    .json({ error: "KhÃ´ng thá»ƒ táº¡o nhÃ  cung cáº¥p má»›i." });
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
            error: friendlyMessage || "KhÃ´ng thá»ƒ táº¡o giÃ¡ sáº£n pháº©m.",
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
        return res.status(400).json({ error: "TÃªn nguá»“n khÃ´ng Ä‘Æ°á»£c bá» trá»‘ng." });
    }
    if (!normalizedPrice || normalizedPrice <= 0) {
        return res.status(400).json({ error: "GiÃ¡ nháº­p pháº£i lá»›n hÆ¡n 0." });
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

        const supplyId = await ensureSupplyRecord(client, normalizedSourceName);

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
                error: "Nguá»“n nÃ y Ä‘Ã£ tá»“n táº¡i cho sáº£n pháº©m.",
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
            error: "KhÃ´ng thá»ƒ thÃªm giÃ¡ nhÃ  cung cáº¥p cho sáº£n pháº©m nÃ y.",
        });
    } finally {
        client.release();
    }
});

app.patch("/api/product-prices/:productId", async(req, res) => {
    const { productId } = req.params;
    const { packageName, packageProduct, sanPham, pctCtv, pctKhach, pctPromo } =
    req.body || {};

    const parsedId = Number(productId);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
        return res.status(400).json({ error: "Invalid product id." });
    }

    const normalizedPackageName = normalizeTextInput(packageName);
    const normalizedPackageProduct = normalizeTextInput(packageProduct);
    const normalizedSanPham = normalizeTextInput(sanPham);

    if (!normalizedSanPham) {
        return res
            .status(400)
            .json({ error: "MÃ£ sáº£n pháº©m (san_pham) lÃ  báº¯t buá»™c." });
    }

    const pctCtvValue = toNullableNumber(pctCtv);
    const pctKhachValue = toNullableNumber(pctKhach);
    const pctPromoValue = toNullableNumber(pctPromo);

    if (!Number.isFinite(pctCtvValue) || pctCtvValue <= 0) {
        return res.status(400).json({ error: "pct_ctv pháº£i lÃ  má»™t sá»‘ dÆ°Æ¡ng." });
    }
    if (!Number.isFinite(pctKhachValue) || pctKhachValue <= 0) {
        return res
            .status(400)
            .json({ error: "pct_khach pháº£i lÃ  má»™t sá»‘ dÆ°Æ¡ng." });
    }
    if (pctPromoValue !== null) {
        const MIN_PROMO_RATIO = 0.01;
        const promoGap = pctCtvValue - pctKhachValue;
        if (!Number.isFinite(pctPromoValue) || pctPromoValue < MIN_PROMO_RATIO) {
            return res.status(400).json({
                error: `pct_promo pháº£i Ã­t nháº¥t lÃ  ${MIN_PROMO_RATIO}.`,
            });
        }
        if (!Number.isFinite(promoGap) || promoGap < MIN_PROMO_RATIO) {
            return res.status(400).json({
                error: "KhÃ´ng thá»ƒ Ä‘áº·t tá»· lá»‡ khuyáº¿n mÃ£i vÃ¬ pct_ctv - pct_khach quÃ¡ nhá».",
            });
        }
        if (pctPromoValue > promoGap) {
            return res.status(400).json({
                error: "pct_promo khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ (pct_ctv - pct_khach).",
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
            return res
                .status(404)
                .json({ error: "Product pricing record not found." });
        }
        const row = result.rows[0] || {};
        const normalizedUpdateDate =
            row.update instanceof Date ? row.update.toISOString() : updatedAtIso;
        res.json({
            id: row.id,
            is_active: row.is_active,
            update: normalizedUpdateDate,
        });
    } catch (error) {
        console.error(
            `Mutation failed (PATCH /api/product-prices/${productId}/status):`,
            error
        );
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
      s.${supplyCols.id} AS id,
      COALESCE(NULLIF(TRIM(s.${supplyCols.sourceName}::text), ''), CONCAT('Nguon #', s.${supplyCols.id}::text)) AS source_name
    FROM mavryk.supply s
    JOIN mavryk.supply_price sp ON s.${supplyCols.id} = sp.source_id
    JOIN mavryk.product_price pp ON sp.product_id = pp.id
    WHERE TRIM(pp.${quoteIdent(PRODUCT_PRICE_COLS.product)}::text) = TRIM($1::text)
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
      TRIM(${bankListCols.bin}::text) AS bin,
      TRIM(${bankListCols.bankName}::text) AS bank_name
    FROM mavryk.bank_list
    WHERE TRIM(${bankListCols.bin}::text) <> ''
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
    const trimmedAccount =
        typeof numberBank === "string" ? numberBank.trim() : "";
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
        const fields = [
            supplyCols.sourceName,
            supplyCols.numberBank,
            supplyCols.binBank,
            supplyCols.activeSupply,
        ];
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
        s.${supplyCols.id} AS id,
        s.${supplyCols.sourceName} AS source_name,
        s.${supplyCols.numberBank} AS number_bank,
        s.${supplyCols.binBank} AS bin_bank,
        COALESCE(s.${supplyCols.activeSupply}, TRUE) AS active_supply,
        COALESCE(bl.${bankListCols.bankName}, '') AS bank_name
      FROM mavryk.supply s
      LEFT JOIN mavryk.bank_list bl
        ON TRIM(bl.${bankListCols.bin}::text) = TRIM(s.${supplyCols.binBank}::text)
      WHERE s.${supplyCols.id} = $1
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

app.patch("/api/supplies/:supplyId", async(req, res) => {
    console.log("[PATCH] /api/supplies/:supplyId", req.params, req.body);
    const { supplyId } = req.params;
    const parsedSupplyId = Number.parseInt(supplyId, 10);
    if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
        return res.status(400).json({ error: "Invalid supplier id." });
    }

    const { sourceName, numberBank, bankBin, bankName } = req.body || {};
    const hasSourceName = typeof sourceName === "string";
    const hasNumberBank = typeof numberBank === "string";
    const hasBankInfo =
        typeof bankBin === "string" || typeof bankName === "string";

    if (!hasSourceName && !hasNumberBank && !hasBankInfo) {
        return res.status(400).json({ error: "No update payload provided." });
    }

    const trimmedName =
        hasSourceName && typeof sourceName === "string"
            ? sourceName.trim()
            : undefined;
    if (hasSourceName && !trimmedName) {
        return res
            .status(400)
            .json({ error: "Supplier name cannot be blank." });
    }

    const trimmedAccount =
        hasNumberBank && typeof numberBank === "string"
            ? numberBank.trim()
            : undefined;

    const trimmedBankBin =
        typeof bankBin === "string" ? bankBin.trim() : undefined;
    const trimmedBankName =
        typeof bankName === "string" ? bankName.trim() : undefined;

    let resolvedBankBin =
        trimmedBankBin !== undefined ? trimmedBankBin : undefined;

    if ((trimmedBankBin === undefined || trimmedBankBin === "") && trimmedBankName) {
        try {
            const bankLookup = await pool.query(
                `
      SELECT TRIM(${bankListCols.bin}::text) AS bin
      FROM mavryk.bank_list
      WHERE LOWER(TRIM(${bankListCols.bankName}::text)) = LOWER($1)
      LIMIT 1;
    `, [trimmedBankName]
            );
            resolvedBankBin = bankLookup.rows?.[0]?.bin || "";
        } catch (error) {
            console.error("Query failed while resolving bank bin:", error);
            return res
                .status(500)
                .json({ error: "Unable to resolve bank selection." });
        }
    }

    if (trimmedBankName && resolvedBankBin === "") {
        return res
            .status(400)
            .json({ error: "Invalid bank name, unable to resolve BIN." });
    }

    const updates = [];
    const params = [];

    if (hasSourceName) {
        updates.push(`${supplyCols.sourceName} = $${params.length + 1}`);
        params.push(trimmedName);
    }

    if (hasNumberBank) {
        updates.push(`${supplyCols.numberBank} = $${params.length + 1}`);
        params.push(trimmedAccount || null);
    }

    if (hasBankInfo) {
        updates.push(`${supplyCols.binBank} = $${params.length + 1}`);
        params.push(resolvedBankBin ? resolvedBankBin : null);
    }

    if (!updates.length) {
        return res.status(400).json({ error: "No update fields provided." });
    }

    params.push(parsedSupplyId);

    try {
        const updateQuery = `
      UPDATE mavryk.supply
      SET ${updates.join(", ")}
      WHERE ${supplyCols.id} = $${params.length}
      RETURNING ${supplyCols.id} AS id;
    `;
        const updateResult = await pool.query(updateQuery, params);
        if (!updateResult.rows.length) {
            return res.status(404).json({ error: "Supplier not found." });
        }

        const detailQuery = `
      SELECT
        s.${supplyCols.id} AS id,
        s.${supplyCols.sourceName} AS source_name,
        s.${supplyCols.numberBank} AS number_bank,
        s.${supplyCols.binBank} AS bin_bank,
        COALESCE(bl.${bankListCols.bankName}, '') AS bank_name
      FROM mavryk.supply s
      LEFT JOIN mavryk.bank_list bl
        ON TRIM(bl.${bankListCols.bin}::text) = TRIM(s.${supplyCols.binBank}::text)
      WHERE s.${supplyCols.id} = $1
      LIMIT 1;
    `;
        const detailResult = await pool.query(detailQuery, [parsedSupplyId]);
        const row = detailResult.rows?.[0];
        if (!row) {
            return res.status(404).json({ error: "Supplier not found." });
        }
        res.json({
            id: parsedSupplyId,
            sourceName: row?.source_name || trimmedName || "",
            numberBank: (row?.number_bank ?? trimmedAccount) || null,
            binBank: (row?.bin_bank ?? resolvedBankBin) || null,
            bankName: row?.bank_name || null,
        });
    } catch (error) {
        console.error("Mutation failed (PATCH /api/supplies/:id):", error);
        res.status(500).json({
            error: "Unable to update supplier.",
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
        const statusLabel = isActive ? "Äang Hoáº¡t Äá»™ng" : "Táº¡m Dá»«ng";
        const params = statusColumn ? [isActive, statusLabel, parsedSupplyId] : [isActive, parsedSupplyId];
        const updateQuery = statusColumn ?
            `
      UPDATE mavryk.supply
      SET ${supplyCols.activeSupply} = $1,
          "${statusColumn}" = $2
      WHERE ${supplyCols.id} = $3
      RETURNING ${supplyCols.activeSupply} AS active_supply, "${statusColumn}" AS raw_status;
    ` :
            `
      UPDATE mavryk.supply
      SET ${supplyCols.activeSupply} = $1
      WHERE ${supplyCols.id} = $2
      RETURNING ${supplyCols.activeSupply} AS active_supply;
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
        const supplySourceKey = createSourceKey(`s.${supplyCols.sourceName}`);
        const { monthStart, nextMonthStart } = getCurrentMonthRange();
        const paymentStatusKey = createVietnameseStatusKey(
            `ps.${paymentSupplyCols.status}`
        );

        const supplyQuery = `
      SELECT
        s.${supplyCols.id} AS id,
        s.${supplyCols.sourceName} AS source_name,
        s.${supplyCols.numberBank} AS number_bank,
        s.${supplyCols.binBank} AS bin_bank,
        ${statusSelect},
        COALESCE(s.${supplyCols.activeSupply}, TRUE) AS active_supply,
        COALESCE(bl.${bankListCols.bankName}, '') AS bank_name,
        ${supplySourceKey} AS supply_key
      FROM mavryk.supply s
      LEFT JOIN mavryk.bank_list bl
        ON TRIM(bl.${bankListCols.bin}::text) = TRIM(s.${supplyCols.binBank}::text)
      WHERE s.${supplyCols.id} = $1
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
            ${createDateNormalization(quoteIdent(ORDER_COLS.orderDate))} AS order_date,
            COALESCE(${createSourceKey(quoteIdent(ORDER_COLS.supply))}, '') AS source_key
          FROM mavryk.order_list
          WHERE TRIM(${quoteIdent(ORDER_COLS.supply)}::text) <> ''
          UNION ALL
          SELECT
            ${createDateNormalization(quoteIdent(ORDER_COLS.orderDate))} AS order_date,
            COALESCE(${createSourceKey(quoteIdent(ORDER_COLS.supply))}, '') AS source_key
          FROM mavryk.order_expired
          WHERE TRIM(${quoteIdent(ORDER_COLS.supply)}::text) <> ''
          UNION ALL
          SELECT
            ${createDateNormalization(quoteIdent(ORDER_COLS.orderDate))} AS order_date,
            COALESCE(${createSourceKey(quoteIdent(ORDER_COLS.supply))}, '') AS source_key
          FROM mavryk.order_canceled
          WHERE TRIM(${quoteIdent(ORDER_COLS.supply)}::text) <> ''
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
        WHERE TRIM(${quoteIdent(ORDER_COLS.supply)}::text) <> ''
          AND ${createSourceKey(quoteIdent(ORDER_COLS.supply))} = $1;
      `;
            const canceledResult = await client.query(canceledQuery, [supplyKey]);
            canceledOrders = Number(canceledResult.rows?.[0]?.canceled_orders) || 0;
        }

        const totalPaidQuery = `
      SELECT
        COALESCE(
          SUM(
            CASE WHEN ${paymentStatusKey} = 'da thanh toan'
              THEN COALESCE(ps.${paymentSupplyCols.paid}, 0)
            ELSE 0
            END
          ),
          0
        ) AS total_paid_amount
      FROM mavryk.payment_supply ps
      WHERE ps.${paymentSupplyCols.sourceId} = $1;
    `;
        const totalPaidResult = await client.query(totalPaidQuery, [
            parsedSupplyId,
        ]);
        const totalPaidAmount =
            Number(totalPaidResult.rows?.[0]?.total_paid_amount) || 0;

        let totalUnpaidAmount = 0;
        try {
            const totalUnpaidAmountQuery = `
      SELECT COALESCE(
        SUM(
          CASE
            WHEN ${paymentStatusKey} = 'chua thanh toan'
              THEN GREATEST(
                COALESCE(ps.${paymentSupplyCols.importValue}, 0) - COALESCE(ps.${paymentSupplyCols.paid}, 0),
                0
              )
            ELSE 0
          END
        ),
        0
      ) AS total_unpaid_amount
      FROM mavryk.payment_supply ps
      WHERE ps.${paymentSupplyCols.sourceId} = $1;
    `;
            const totalUnpaidAmountResult = await client.query(
                totalUnpaidAmountQuery, [parsedSupplyId]
            );
            totalUnpaidAmount =
                Number(totalUnpaidAmountResult.rows?.[0]?.total_unpaid_amount) || 0;
        } catch (err) {
            console.error("Failed to compute total unpaid amount:", err);
            totalUnpaidAmount = 0;
        }

        const unpaidQuery = `
      SELECT
        ps.${paymentSupplyCols.id} AS id,
        ps.${paymentSupplyCols.round} AS round,
        COALESCE(ps.${paymentSupplyCols.importValue}, 0) AS import_value,
        COALESCE(ps.${paymentSupplyCols.paid}, 0) AS paid_value,
        COALESCE(ps.${paymentSupplyCols.status}, '') AS status_label
      FROM mavryk.payment_supply ps
      WHERE ps.${paymentSupplyCols.sourceId} = $1
        AND ${paymentStatusKey} = 'chua thanh toan'
      ORDER BY ps.${paymentSupplyCols.id} DESC;
    `;
        const unpaidResult = await client.query(unpaidQuery, [parsedSupplyId]);
        const unpaidPayments = (unpaidResult.rows || []).map((row) => ({
            id: row.id,
            round: row.round || "",
            totalImport: Number(row.import_value) || 0,
            paid: Number(row.paid_value) || 0,
            status: row.status_label || "",
        }));

        // Nếu còn công nợ nhưng không có chu kỳ chưa thanh toán, tạo bản ghi ảo để hiển thị thanh toán
        if ((!unpaidPayments || unpaidPayments.length === 0) && totalUnpaidAmount > 0) {
            unpaidPayments.push({
                id: 0,
                round: "Tiền nợ",
                totalImport: totalUnpaidAmount,
                paid: 0,
                status: "Chưa Thanh Toán",
            });
        }

        res.json({
            supply: {
                id: supplyRow.id,
                sourceName: supplyRow.source_name || "",
                numberBank: supplyRow.number_bank || null,
                binBank: supplyRow.bin_bank || null,
                bankName: supplyRow.bank_name || null,
                status: supplyRow.active_supply === false ?
                    "inactive" : normalizeSupplyStatus(supplyRow.raw_status),
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
    const parsePaid = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
            return value;
        }
        const cleaned = String(value).replace(/[^0-9]/g, "");
        if (!cleaned) return null;
        const num = Number(cleaned);
        return Number.isFinite(num) && num >= 0 ? num : null;
    };
    const paidAmountNumber = parsePaid(paidAmountRaw);
    const hasPaidAmount = paidAmountNumber !== null;

    try {
        await pool.query("BEGIN");

        const paymentResult = await pool.query(
            `
        SELECT ${paymentSupplyCols.id} AS id, ${paymentSupplyCols.sourceId} AS source_id, ${paymentSupplyCols.importValue} AS import, ${paymentSupplyCols.paid} AS paid, ${paymentSupplyCols.round} AS round, ${paymentSupplyCols.status} AS status
        FROM mavryk.payment_supply
        WHERE ${paymentSupplyCols.id} = $1
        LIMIT 1;
      `, [parsedPaymentId]
        );
        if (!paymentResult.rows.length) {
            await pool.query("ROLLBACK");
            return res.status(404).json({ error: "Payment record not found." });
        }
        const paymentRow = paymentResult.rows[0];
        const sourceId = Number(paymentRow.source_id);
        const normalizedPaidAmount =
            hasPaidAmount && paidAmountNumber !== null ?
            paidAmountNumber :
            Number(paymentRow.import) || 0;

        const todayDMY =
            typeof Helpers.getTodayDMY === "function"
                ? Helpers.getTodayDMY()
                : (() => {
                      const now = new Date();
                      const day = String(now.getUTCDate()).padStart(2, "0");
                      const month = String(now.getUTCMonth() + 1).padStart(2, "0");
                      const year = now.getUTCFullYear();
                      return `${day}/${month}/${year}`;
                  })();

        // Láº¥y tÃªn nguá»“n Ä‘á»ƒ map vá»›i order_list.nguon
        const supplyResult = await pool.query(
            `SELECT ${supplyCols.sourceName} AS source_name FROM mavryk.supply WHERE ${supplyCols.id} = $1 LIMIT 1;`, [sourceId]
        );
        const sourceName =
            (supplyResult.rows &&
                supplyResult.rows[0] &&
                supplyResult.rows[0].source_name) ||
            "";
        const trimmedSourceName = sourceName.trim();

        // ÄÆ¡n chÆ°a thanh toÃ¡n cá»§a nguá»“n nÃ y (láº¥y tá»« cÅ© Ä‘áº¿n má»›i)
        const unpaidResult = await pool.query(
            `
        SELECT
          id,
          COALESCE(cost, 0) AS cost,
          ${createDateNormalization("order_date")} AS order_date
        FROM ${DB_SCHEMA}.order_list
        WHERE ${createVietnameseStatusKey("status")} = 'chua thanh toan'
          AND COALESCE(check_flag, FALSE) = FALSE
          AND TRIM(supply::text) = TRIM($1)
        ORDER BY order_date ASC NULLS FIRST, id ASC;
      `, [trimmedSourceName]
        );

        const unpaidRows = unpaidResult.rows || [];
        let runningSum = 0;
        const orderIdsToMark = [];
        for (const row of unpaidRows) {
            if (runningSum >= normalizedPaidAmount) break;
            const costValue = Number(row.cost) || 0;
            runningSum += costValue;
            orderIdsToMark.push(row.id);
        }

        if (orderIdsToMark.length) {
            await pool.query(
                `
          UPDATE ${DB_SCHEMA}.order_list
          SET status = 'Đã Thanh Toán',
              check_flag = TRUE
          WHERE id = ANY($1::int[]);
        `, [orderIdsToMark]
            );
        }

        const totalUnpaidImport = unpaidRows.reduce(
            (acc, row) => acc + (Number(row.cost) || 0),
            0
        );
        const remainingImport = Math.max(
            0,
            totalUnpaidImport - normalizedPaidAmount
        );

        // Only consider creating a new payment cycle when there are no other unpaid cycles
        let hasUnpaidCycle = false;
        if (sourceId) {
            const unpaidCycleResult = await pool.query(
                `
          SELECT 1
          FROM ${DB_SCHEMA}.payment_supply ps
          WHERE ps.${paymentSupplyCols.sourceId} = $1
            AND ${createVietnameseStatusKey(`ps.${paymentSupplyCols.status}`)} = 'chua thanh toan'
          LIMIT 1;
        `, [sourceId]
            );
            hasUnpaidCycle = unpaidCycleResult.rows.length > 0;
        }

        // Náº¿u cÃ²n dÆ° thÃ¬ táº¡o chu ká»³ má»›i "Chưa Thanh Toán" vá»›i ghi chÃº ngÃ y hiá»‡n táº¡i
        if (remainingImport > 0 && sourceId && !hasUnpaidCycle) {
            await pool.query(
                `
          INSERT INTO mavryk.payment_supply (${paymentSupplyCols.sourceId}, ${paymentSupplyCols.importValue}, ${paymentSupplyCols.paid}, ${paymentSupplyCols.round}, ${paymentSupplyCols.status})
          VALUES ($1, $2, 0, $3, 'Chưa Thanh Toán');
        `, [sourceId, remainingImport, todayDMY]
            );
        }

        const updateQuery = `
      UPDATE mavryk.payment_supply
      SET ${paymentSupplyCols.status} = 'Đã Thanh Toán',
          ${paymentSupplyCols.paid} = $2,
          ${paymentSupplyCols.round} = TRIM(BOTH ' ' FROM CONCAT(COALESCE(${paymentSupplyCols.round}::text, ''), ' - ', $3::text))
      WHERE ${paymentSupplyCols.id} = $1
      RETURNING ${paymentSupplyCols.id} AS id, ${paymentSupplyCols.sourceId} AS source_id, ${paymentSupplyCols.importValue} AS import, ${paymentSupplyCols.paid} AS paid, ${paymentSupplyCols.status} AS status, ${paymentSupplyCols.round} AS round;
    `;
        const result = await pool.query(updateQuery, [
            parsedPaymentId,
            normalizedPaidAmount,
            todayDMY,
        ]);

        await pool.query("COMMIT");
        res.json(result.rows[0]);
    } catch (error) {
        await pool.query("ROLLBACK");
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
    const {
        supply_id,
        san_pham_name,
        id_product,
        id_order,
        customer_type,
    } = req.body || {};

    const productNameRaw = san_pham_name ?? id_product;
    const productName =
        productNameRaw === undefined || productNameRaw === null ?
        "" :
        String(productNameRaw);
    const orderId =
        id_order === undefined || id_order === null ?
        "" :
        String(id_order).trim();

    if (!productName || !orderId) {
        return res.status(400).json({
            error: "Missing required fields: san_pham_name/id_product and id_order.",
        });
    }

    const parsedSupplyId = Number(supply_id);

    const orderLookupQuery = `
    SELECT
      id_product,
      price AS gia_ban,
      cost AS gia_nhap,
      supply::text AS supply_name
    FROM mavryk.order_list
    WHERE id_order = $1
    LIMIT 1;
  `;

    const productLookupExactQuery = `
    SELECT
      id,
      pct_ctv,
      pct_khach,
      ${quoteIdent(PRODUCT_PRICE_COLS.pctPromo)} AS pct_promo,
      is_active
    FROM mavryk.product_price
    WHERE
      LOWER(TRIM(san_pham::text)) = LOWER(TRIM($1))
      OR LOWER(TRIM(package_product::text)) = LOWER(TRIM($1))
      OR LOWER(TRIM(package::text)) = LOWER(TRIM($1))
    LIMIT 1;
  `;

    const productLookupFuzzyQuery = `
    SELECT
      id,
      pct_ctv,
      pct_khach,
      ${quoteIdent(PRODUCT_PRICE_COLS.pctPromo)} AS pct_promo,
      is_active
    FROM mavryk.product_price
    WHERE
      LOWER(TRIM($1)) LIKE '%' || LOWER(TRIM(san_pham::text)) || '%'
      OR LOWER(TRIM($1)) LIKE '%' || LOWER(TRIM(package_product::text)) || '%'
      OR LOWER(TRIM($1)) LIKE '%' || LOWER(TRIM(package::text)) || '%'
      OR LOWER(TRIM(san_pham::text)) LIKE '%' || LOWER(TRIM($1)) || '%'
    LIMIT 1;
  `;

    const productSupplyPricesQuery = `
    SELECT source_id, price
    FROM mavryk.supply_price
    WHERE product_id = $1
  `;

    try {
        const orderResult = await pool.query(orderLookupQuery, [orderId]);
        const orderRow = orderResult.rows[0] || {};

        const normalizeSupplyName = (value) => {
            if (value === null || value === undefined) return "";
            return String(value).trim();
        };

        const resolveSupplyId = async(nameRaw) => {
            const raw = normalizeSupplyName(nameRaw);
            if (!raw) return null;
            const noAt = raw.replace(/^@/, "");
            const lower = raw.toLowerCase();
            const lowerNoAt = noAt.toLowerCase();

            const sql = `
              SELECT id FROM mavryk.supply
              WHERE LOWER(TRIM(source_name::text)) = $1
                 OR LOWER(TRIM(source_name::text)) = $2
                 OR LOWER(TRIM(source_name::text)) LIKE $3
              LIMIT 1;
            `;
            const result = await pool.query(sql, [
                lower,
                lowerNoAt,
                `%${lowerNoAt}%`,
            ]);
            return result.rows?.[0]?.id ? Number(result.rows[0].id) : null;
        };

        const productLookupKey =
            orderRow.id_product !== undefined && orderRow.id_product !== null ?
            String(orderRow.id_product) :
            productName;

        let effectiveSupplyId = Number.isFinite(parsedSupplyId) ? parsedSupplyId : null;
        let supplyFromOrderLookup = null;
        let supplyFromCustomerTypeLookup = null;

        if (effectiveSupplyId === null) {
            supplyFromOrderLookup = await resolveSupplyId(orderRow.supply_name);
            effectiveSupplyId = supplyFromOrderLookup;
        }
        if (effectiveSupplyId === null) {
            supplyFromCustomerTypeLookup = await resolveSupplyId(customer_type);
            effectiveSupplyId = supplyFromCustomerTypeLookup;
        }

        const buildNameCandidates = (raw) => {
            const names = [];
            const base = String(raw || "").trim();
            if (base) names.push(base);
            const singleDash = base.replace(/--+/g, "-").replace(/__+/g, "_");
            if (singleDash && singleDash !== base) names.push(singleDash);
            const noSpaces = base.replace(/\s+/g, "");
            if (noSpaces && !names.includes(noSpaces)) names.push(noSpaces);
            return names.filter(Boolean);
        };

        const tryFindProductPricing = async(nameList) => {
            for (const name of nameList) {
                const exact = await pool.query(productLookupExactQuery, [name]);
                if (exact.rows?.[0]) return exact.rows[0];
            }
            for (const name of nameList) {
                const fuzzy = await pool.query(productLookupFuzzyQuery, [name]);
                if (fuzzy.rows?.[0]) return fuzzy.rows[0];
            }
            return null;
        };

        const nameCandidates = buildNameCandidates(productLookupKey);
        const productPricing = await tryFindProductPricing(nameCandidates);

        const currentOrderPrice = Number(orderRow.gia_ban);
        const currentOrderImport = Number(orderRow.gia_nhap);

        const normalizedId = String(orderId || "")
            .trim()
            .toUpperCase();
        const normalizedCustomerType = String(customer_type || "")
            .trim()
            .toUpperCase();
        const prefixThuong = (ORDER_PREFIXES?.thuong || "").toUpperCase();
        const prefixLe = (ORDER_PREFIXES?.le || "").toUpperCase();
        const prefixCtv = (ORDER_PREFIXES?.ctv || "").toUpperCase();
        const prefixList = [prefixThuong, prefixLe, prefixCtv].filter(Boolean);

        const typeFromPrefix =
            prefixList.find((p) => normalizedId.startsWith(p)) || "";

        const normalizedType = prefixList.includes(normalizedCustomerType) ?
            normalizedCustomerType :
            "";

        const customerLabel = normalizedType || typeFromPrefix;

        const pctCtvRaw = Number(productPricing?.pct_ctv);
        const pctKhachRaw = Number(productPricing?.pct_khach);
        const pctCtv =
            Number.isFinite(pctCtvRaw) && pctCtvRaw > 0 ? pctCtvRaw : 1.0;
        const pctKhachValid = Number.isFinite(pctKhachRaw) && pctKhachRaw > 0;
        const pctKhach = pctKhachValid ? pctKhachRaw : 1.0;
        const pctPromoRaw = Number(productPricing?.pct_promo);
        const pctPromo =
            Number.isFinite(pctPromoRaw) && pctPromoRaw >= 0 ? pctPromoRaw : 0;

        const supplyPriceRows = productPricing ?
            (await pool.query(productSupplyPricesQuery, [productPricing.id]))
            .rows || [] : [];

        const highestSupplyPrice = supplyPriceRows.reduce((max, row) => {
            const price = Number(row.price);
            return Number.isFinite(price) && price > max ? price : max;
        }, 0);
        const computedWholesale = 0;
        const computedRetail = 0;

        let baseImport = null;

        if (Number.isFinite(highestSupplyPrice) && highestSupplyPrice > 0) {
            baseImport = highestSupplyPrice;
        }

        if (
            baseImport === null &&
            Number.isFinite(computedWholesale) &&
            computedWholesale > 0
        ) {
            baseImport = computedWholesale;
        }

        if (
            baseImport === null &&
            customerLabel === prefixLe &&
            Number.isFinite(computedRetail) &&
            computedRetail > 0
        ) {
            baseImport = computedRetail;
        }

        // Náº¿u khÃ´ng tÃ¬m tháº¥y giÃ¡ nguá»“n, tráº£ lá»—i thay vÃ¬ fallback vá» cost/price cá»§a Ä‘Æ¡n
        if (baseImport === null) {
            return res.status(400).json({
                error: "KhÃ´ng tÃ¬m Ä‘Æ°á»£c giÃ¡ nguá»“n Ä‘á»ƒ tÃ­nh toÃ¡n.",
            });
        }

        if (customerLabel === prefixLe && !pctKhachValid) {
            return res.status(400).json({
                error: "Sáº£n pháº©m chÆ°a thiáº¿t láº­p pct_khach Ä‘á»ƒ tÃ­nh giÃ¡ MAVL.",
            });
        }

        const computeByType = (baseValue) => {
            if (!Number.isFinite(baseValue) || baseValue <= 0) return null;
            if (customerLabel === prefixThuong) {
                return Helpers.roundGiaBanValue(baseValue);
            }
            if (customerLabel === prefixCtv || !customerLabel) {
                return Helpers.roundGiaBanValue(baseValue * pctCtv);
            }
            if (customerLabel === prefixLe) {
                return Helpers.roundGiaBanValue(baseValue * pctCtv * pctKhach);
            }
            return Helpers.roundGiaBanValue(baseValue * pctCtv);
        };

        const computedPrice = computeByType(baseImport);
        const computedPromo =
            customerLabel === prefixLe && baseImport !== null
                ? computePromoPriceFromSupply(
                    baseImport,
                    pctCtv,
                    pctKhach,
                    pctPromo
                  )
                : null;

        let giaNhap = Number.isFinite(baseImport) ? baseImport : 0;
        let finalPrice =
            computedPrice !== null ?
            computedPrice :
            Helpers.roundGiaBanValue(Math.max(0, Number(baseImport) || 0));

        const months = Helpers.monthsFromString(productName);
        const days = Helpers.daysFromMonths(months) || 30;

        const roundedGiaNhap = roundToNearestThousand(
            Helpers.roundGiaBanValue(Number(giaNhap) || 0)
        );
        const roundedGiaBan = roundToNearestThousand(
            Helpers.roundGiaBanValue(Math.max(0, Number(finalPrice) || 0))
        );

        res.json({
            cost: Math.max(0, roundedGiaNhap),
            price: Math.max(0, roundedGiaBan),
            promoPrice:
                Number.isFinite(computedPromo) && computedPromo > 0
                    ? Math.max(
                        0,
                        roundToNearestThousand(
                            Helpers.roundGiaBanValue(computedPromo)
                        )
                      )
                    : undefined,
            days: Number(days),
            order_expired: "",
        });
    } catch (error) {
        console.error(`Pricing calculation failed (${id_order}):`, error);
        res.status(500).json({
            error: "Unable to calculate price for the requested product.",
        });
    }
});

app.post("/api/orders", async(req, res) => {
    console.log("[POST] /api/orders");
    const payload = sanitizeOrderWritePayload(req.body);
    delete payload.id;

    payload.order_date = normalizeDateInput(payload.order_date);
    payload.order_expired = normalizeDateInput(payload.order_expired);
    payload.status = payload.status || "Chưa Thanh Toán";
    payload.check_flag = null;
    const normalizedSourceName = normalizeTextInput(payload.supply);
    if (normalizedSourceName) {
        payload.supply = normalizedSourceName;
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
        const normalizedRow = normalizeOrderRow(
            result.rows[0],
            todayYMDInVietnam()
        );
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

    const setClauses = fields.map((column, index) => {
        const cast =
            column === ORDER_COLS.orderDate || column === ORDER_COLS.orderExpired ?
            "::date" :
            "";
        return `"${column}" = $${index + 1}${cast}`;
    });
    const values = fields.map((column) => payload[column]);

    // Náº¿u tráº¡ng thÃ¡i set vá» "Đã Thanh Toán" thÃ¬ tá»± Ä‘á»™ng báº­t check_flag = TRUE
    if (
        payload.status &&
        typeof payload.status === "string" &&
        payload.status.trim() === "Đã Thanh Toán" &&
        !fields.includes("check_flag")
    ) {
        setClauses.push(`"check_flag" = $${values.length + 1}`);
        values.push(true);
    }

    const q = `
    UPDATE mavryk.order_list
    SET ${setClauses.join(", ")}
    WHERE id = $${fields.length + 1}
    RETURNING *,
      order_date::text AS order_date_raw,
      order_expired::text      AS order_expired_raw;
  `;

    try {
        const result = await pool.query(q, [...values, parsedId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Order not found." });
        }
        const normalizedRow = normalizeOrderRow(
            result.rows[0],
            todayYMDInVietnam()
        );
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
             order_date::text AS order_date_raw,
             order_expired::text      AS order_expired_raw
      FROM mavryk.order_list
      WHERE id = $1
    `, [parsedId]
        );

        if (existingResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Order not found." });
        }

        const todayYmd = todayYMDInVietnam();
        const cancellationRefundRaw = req.body?.refund ?? null;
        const cancellationRefund = toNullableNumber(cancellationRefundRaw);
        const normalizedRow = normalizeOrderRow(existingResult.rows[0], todayYmd);
        const normalizedStatusKey = normalizeStatusKey(normalizedRow?.status);
        const normalizedCheckFlag = normalizeCheckFlagValue(
            normalizedRow?.check_flag
        );
        const shouldHardDelete =
            normalizedStatusKey.startsWith("chuathanhto") &&
            normalizedCheckFlag === null;

        // Newly created, unpaid orders (status "Chua Thanh Toan" & check_flag is null)
        // should be removed outright without archiving to refund/expired tables.
        if (shouldHardDelete) {
            await client.query(
                `
      DELETE FROM mavryk.order_list
      WHERE id = $1
    `, [parsedId]
            );
            await client.query("COMMIT");
            return res.json({
                success: true,
                deletedId: parsedId,
                movedTo: "deleted",
                deletedOrder: normalizedRow,
            });
        }

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
                refund: cancellationRefund !== null ?
                    cancellationRefund :
                    toNullableNumber(
                        normalizedRow?.gia_tri_con_lai ?? normalizedRow?.price ?? 0
                    ),
                status: "Chưa Hoàn",
                check_flag: false,
                createdate: new Date(),
            },
        };

        const { sql: archiveSql, values: archiveValues } = buildArchiveInsert(
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
      sp.${supplyPriceCols.sourceId} AS source_id,
      COALESCE(
        NULLIF(TRIM(s.${supplyCols.sourceName}::text), ''),
        CONCAT('Nguon #', sp.${supplyPriceCols.sourceId}::text)
      ) AS source_name,
      sp.${supplyPriceCols.price} AS price,
      recent.last_order_date
    FROM mavryk.supply_price sp
    JOIN mavryk.product_price pp ON sp.${supplyPriceCols.productId} = pp.id
    LEFT JOIN mavryk.supply s ON sp.${supplyPriceCols.sourceId} = s.${supplyCols.id}
  LEFT JOIN LATERAL (
      SELECT MAX(ol.order_date) AS last_order_date
      FROM mavryk.order_list ol
      WHERE
        s.${supplyCols.sourceName} IS NOT NULL
        AND LOWER(TRIM(ol.${quoteIdent(ORDER_COLS.supply)}::text)) = LOWER(TRIM(s.${supplyCols.sourceName}::text))
    ) AS recent ON TRUE
    WHERE pp.${quoteIdent(PRODUCT_PRICE_COLS.product)} = $1
    ORDER BY
      sp.${supplyPriceCols.price} ASC NULLS LAST,
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

app.delete("/api/products/:productId/suppliers/:sourceId", async(req, res) => {
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
                .json({ error: "Nguá»“n nÃ y khÃ´ng tá»“n táº¡i cho sáº£n pháº©m." });
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

// Start Sepay webhook server alongside backend API
sepayWebhookApp.listen(SEPAY_PORT, SEPAY_HOST, () => {
    console.log(
        `Sepay webhook listening at http://${SEPAY_HOST}:${SEPAY_PORT}/api/payment/notify`
    );
});

// Package products: export data with account storage details
app.get("/api/package-products", async(_req, res) => {
    console.log("[GET] /api/package-products");
    try {
        const result = await pool.query(
            `${PACKAGE_PRODUCTS_SELECT} ORDER BY pp.id ASC`
        );
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
    const normalizedMatchMode =
        matchMode === "slot" ? "slot" : "thong_tin_don_hang";
    try {
        await client.query("BEGIN");
        const pkgResult = await client.query(
            `
        INSERT INTO mavryk.package_product
          (${packageProductCols.package}, ${packageProductCols.username}, ${packageProductCols.password}, ${packageProductCols.mail2nd}, ${packageProductCols.note}, ${packageProductCols.supplier}, ${packageProductCols.importPrice}, ${packageProductCols.expired}, ${packageProductCols.slot}, ${packageProductCols.match})
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
        if (
            hasAccountStoragePayload({
                accountUser,
                accountPass,
                accountMail,
                accountNote,
                capacity,
            })
        ) {
            const nextStorageId = await getNextAccountStorageId(client);
            await client.query(
                `
          INSERT INTO mavryk.account_storage
            (${accountStorageCols.id}, ${accountStorageCols.username}, ${accountStorageCols.password}, ${accountStorageCols.mail2nd}, ${accountStorageCols.note}, ${accountStorageCols.storage}, ${accountStorageCols.mailFamily})
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
    if (
        accountStorageId !== undefined &&
        accountStorageId !== null &&
        accountStorageId !== ""
    ) {
        const parsed = Number(accountStorageId);
        storageIdNumber = Number.isFinite(parsed) ? parsed : null;
    }
    const client = await pool.connect();
    const normalizedExpired = normalizeDateInput(expired);
    const normalizedSlotLimit = toNullableNumber(slotLimit);
    const normalizedMatchMode =
        matchMode === "slot" ? "slot" : "thong_tin_don_hang";
    try {
        await client.query("BEGIN");
        const pkgResult = await client.query(
            `
        UPDATE mavryk.package_product
        SET ${packageProductCols.package} = $1,
            ${packageProductCols.username} = $2,
            ${packageProductCols.password} = $3,
            ${packageProductCols.mail2nd} = $4,
            ${packageProductCols.note} = $5,
            ${packageProductCols.supplier} = $6,
            ${packageProductCols.importPrice} = $7,
            ${packageProductCols.expired} = $8,
            ${packageProductCols.slot} = $9,
            ${packageProductCols.match} = $10
        WHERE ${packageProductCols.id} = $11
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
          SET ${accountStorageCols.username} = $1,
              ${accountStorageCols.password} = $2,
              ${accountStorageCols.mail2nd} = $3,
              ${accountStorageCols.note} = $4,
              ${accountStorageCols.storage} = $5,
              ${accountStorageCols.mailFamily} = $6
          WHERE ${accountStorageCols.id} = $7;
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
            (${accountStorageCols.id}, ${accountStorageCols.username}, ${accountStorageCols.password}, ${accountStorageCols.mail2nd}, ${accountStorageCols.note}, ${accountStorageCols.storage}, ${accountStorageCols.mailFamily})
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
        console.error(
            `Delete failed (${req.method} /api/package-products/bulk-delete):`,
            error
        );
        res.status(500).json({ error: "Unable to delete package products." });
    } finally {
        client.release();
    }
};
app.delete("/api/package-products/bulk-delete", handleBulkDeletePackages);
app.post("/api/package-products/bulk-delete", handleBulkDeletePackages);

