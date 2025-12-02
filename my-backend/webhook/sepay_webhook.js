/* Sepay webhook server (Node/Express) */
require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const https = require("https");
const { Pool } = require("pg");
const cron = require("node-cron");
const {
    ORDER_COLS,
    PAYMENT_RECEIPT_COLS,
    PAYMENT_SUPPLY_COLS,
    PRODUCT_PRICE_COLS,
    SUPPLY_COLS,
    SUPPLY_PRICE_COLS,
} = require("../schema/tables");
const { monthsFromString, ORDER_PREFIXES } = require("../helpers");

const app = express();

const DB_SCHEMA = process.env.DB_SCHEMA || "mavryk";
const SEPAY_WEBHOOK_PATH = "/api/payment/notify";
const SEPAY_WEBHOOK_SECRET =
    process.env.SEPAY_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || "";
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";
const HOST = process.env.SEPAY_HOST || "0.0.0.0";
const PORT = Number(process.env.SEPAY_PORT) || 5000;

const DEFAULT_NOTIFICATION_GROUP_ID = "-1002934465528";
const DEFAULT_RENEWAL_TOPIC_ID = 2;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID =
    process.env.RENEWAL_GROUP_ID ||
    process.env.NOTIFICATION_CHAT_ID ||
    process.env.TELEGRAM_CHAT_ID ||
    DEFAULT_NOTIFICATION_GROUP_ID;
const TELEGRAM_TOPIC_ID = Number.parseInt(
    process.env.RENEWAL_TOPIC_ID ||
    process.env.TELEGRAM_TOPIC_ID ||
    DEFAULT_RENEWAL_TOPIC_ID,
    10
);
const SEND_RENEWAL_TO_TOPIC =
    String(process.env.SEND_RENEWAL_TO_TOPIC || "true").toLowerCase() !==
    "false";
const APP_TIMEZONE =
    typeof process.env.APP_TIMEZONE === "string" &&
    /^[A-Za-z0-9_\/+\-]+$/.test(process.env.APP_TIMEZONE) ?
    process.env.APP_TIMEZONE :
    "Asia/Ho_Chi_Minh";
const RENEWAL_CRON_SCHEDULE =
    process.env.RENEWAL_CRON_SCHEDULE && process.env.RENEWAL_CRON_SCHEDULE.trim() ?
    process.env.RENEWAL_CRON_SCHEDULE.trim() :
    "0 23 * * *"; // 23:00 Asia/Ho_Chi_Minh
const RENEWAL_CRON_ENABLED =
    String(process.env.ENABLE_RENEWAL_CRON || "true").toLowerCase() !== "false";

const stripAccents = (value) =>
    String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Capture raw body for HMAC verification
app.use(
    express.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
    })
);

// Postgres pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
});

const PAYMENT_RECEIPT_TABLE = `${DB_SCHEMA}.payment_receipt`;
const ORDER_TABLE = `${DB_SCHEMA}.order_list`;
const PRODUCT_PRICE_TABLE = `${DB_SCHEMA}.product_price`;
const SUPPLY_TABLE = `${DB_SCHEMA}.supply`;
const SUPPLY_PRICE_TABLE = `${DB_SCHEMA}.supply_price`;
const PAYMENT_SUPPLY_TABLE = `${DB_SCHEMA}.payment_supply`;

const safeStringify = (data) => {
  try {
    return JSON.stringify(data);
  } catch (err) {
    return "[unserializable payload]";
  }
};

const extractOrderCodeFromText = (...fields) => {
  for (const field of fields) {
    if (!field) continue;
    const match = String(field).match(/MAV\w+/i);
    if (match) return match[0].toUpperCase();
  }
  return "";
};

const extractSenderFromContent = (text) => {
  if (!text) return "";
  const str = String(text);
  const match = str.match(/NHAN\s+TU\s+([A-Za-z0-9]+)/i);
  if (match && match[1]) return match[1].trim();
  return "";
};

const normalizeTransactionPayload = (payload) => {
  if (!payload) return null;
  // If nested transaction object exists, use it directly
  if (payload.transaction && typeof payload.transaction === "object") {
    return payload.transaction;
  }

  // Sepay may post flat fields; map them into expected keys
  const transaction_content =
    payload.content ||
    payload.description ||
    payload.note ||
    payload.transaction_content ||
    "";
  const transaction_date =
    payload.transactionDate ||
    payload.transaction_date ||
    payload.transferTime ||
    payload.time;
  const amount_in =
    payload.amount_in ||
    payload.transferAmount ||
    payload.amountIn ||
    payload.amount ||
    0;

  if (!transaction_content && !transaction_date && !amount_in) return null;

  return {
    transaction_content,
    transaction_date,
    amount_in,
    note: payload.note || payload.description || payload.content || "",
    description: payload.description || "",
    account_number: payload.accountNumber || payload.account_number || "",
    transfer_amount: payload.transferAmount || payload.amount || payload.amount_in,
    transaction_date_raw: payload.transactionDate || payload.transaction_date || payload.transferTime || payload.time,
  };
};

const resolveSepaySignature = (req) => {
  return (
    req.get("X-SEPAY-SIGNATURE") ||
    req.get("X-Signature") ||
    req.get("Signature") ||
    req.get("X-Webhook-Signature") ||
    req.query?.signature ||
    req.query?.sign
  );
};

const verifySepaySignature = (rawBody, signature) => {
  if (!SEPAY_WEBHOOK_SECRET || !signature || !rawBody) return false;
  const expected = crypto
    .createHmac("sha256", SEPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(String(signature).trim(), "hex")
    );
  } catch {
    return false;
  }
};

const extractApiKey = (req) => {
  const auth = req.get("Authorization") || req.get("X-API-KEY") || "";
  const trimmed = String(auth || "").trim();
  const match = trimmed.match(/^Apikey\s+(.+)$/i);
  if (match && match[1]) return match[1].trim();
  if (trimmed && !trimmed.toLowerCase().startsWith("apikey")) return trimmed;
  return "";
};

const isValidApiKey = (req) => {
  if (!SEPAY_API_KEY) return false;
  const incoming = extractApiKey(req);
  if (!incoming) return false;
  const incomingTrimmed = String(incoming).trim();
  const expectedTrimmed = String(SEPAY_API_KEY).trim();
  if (incomingTrimmed === expectedTrimmed) return true;
  // Fallback to constant-time compare to avoid accidental mismatch due to timing
  try {
    return crypto.timingSafeEqual(
      Buffer.from(incomingTrimmed),
      Buffer.from(expectedTrimmed)
    );
  } catch {
    return false;
  }
};

const splitTransactionContent = (content) => {
    const parts = (content || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return ["", ""];
    if (parts.length === 1) return [parts[0], parts[0]];
    return [parts[parts.length - 1], parts[0]];
};

const parsePaidDate = (value) => {
    const text = String(value || "").trim();
    const iso = text.replace(" ", "T");
    const dt = new Date(iso);
    if (!Number.isNaN(dt.getTime())) {
        return dt.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    const today = new Date();
    return today.toISOString().slice(0, 10);
};

const normalizeAmount = (value) => {
    const text = String(value || "0").split(".")[0];
    const digits = text.replace(/[^\d-]/g, "");
    const parsed = Number.parseInt(digits, 10);
    return Number.isFinite(parsed) ? parsed : 0;
};

const insertPaymentReceipt = async(transaction) => {
    const orderCode = extractOrderCodeFromText(
        transaction.transaction_content,
        transaction.description
    );
    const senderParsed = extractSenderFromContent(
        transaction.transaction_content || transaction.description
    );
    const receiverAccount = transaction.account_number || transaction.accountNumber || "";
    const paidDate = parsePaidDate(transaction.transaction_date || transaction.transaction_date_raw);
    const amount = normalizeAmount(transaction.transfer_amount || transaction.amount_in);
    const baseNote = transaction.description || transaction.transaction_content || transaction.note || "";
    const noteValue = senderParsed ? `[Sender:${senderParsed}] ${baseNote}` : baseNote;
    const sql = `
    INSERT INTO ${PAYMENT_RECEIPT_TABLE} (
      ${PAYMENT_RECEIPT_COLS.orderCode},
      ${PAYMENT_RECEIPT_COLS.paidDate},
      ${PAYMENT_RECEIPT_COLS.amount},
      ${PAYMENT_RECEIPT_COLS.receiver},
      ${PAYMENT_RECEIPT_COLS.sender},
      ${PAYMENT_RECEIPT_COLS.note}
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `;
    await pool.query(sql, [
        orderCode,
        paidDate,
        amount,
        receiverAccount,
        senderParsed || "",
        noteValue,
    ]);
};

const normalizeProductDuration = (text = "") =>
    String(text || "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/-+\s*(\d+)\s*m\b/gi, "--$1m");

const parseFlexibleDate = (value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    const text = String(value).trim();
    const direct = new Date(text.replace(" ", "T"));
    if (!Number.isNaN(direct.getTime())) return direct;

    const parts = text.split(/[/-]/);
    if (parts.length === 3) {
        const [p1, p2, p3] = parts;
        const dmy = new Date(`${p3}-${p2}-${p1}`);
        if (!Number.isNaN(dmy.getTime())) return dmy;
        const ymd = new Date(`${p1}-${p2}-${p3}`);
        if (!Number.isNaN(ymd.getTime())) return ymd;
    }
    return null;
};

const formatDateDMY = (date) => {
    if (!(date instanceof Date)) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const formatDateDB = (date) => {
    if (!(date instanceof Date)) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}/${month}/${day}`;
};

const addDays = (date, days) => {
    const base = date instanceof Date ? new Date(date.getTime()) : new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + days);
    return base;
};

const addMonthsClamped = (date, months) => {
    const base = date instanceof Date ? new Date(date.getTime()) : new Date();
    base.setHours(0, 0, 0, 0);
    const originalDay = base.getDate();
    const target = new Date(base.getTime());
    target.setDate(1);
    target.setMonth(target.getMonth() + months);
    const daysInTargetMonth = new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0
    ).getDate();
    target.setDate(Math.min(originalDay, daysInTargetMonth));
    return target;
};

const daysUntil = (value) => {
    const dt = parseFlexibleDate(value);
    if (!dt) return Number.POSITIVE_INFINITY;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((dt.getTime() - today.getTime()) / 86_400_000);
    return diff;
};

const normalizeMoney = (value) => {
    const digits = String(value ?? "").replace(/[^\d-]/g, "");
    const numeric = Number.parseInt(digits || "0", 10);
    return Number.isFinite(numeric) ? numeric : 0;
};

// Normalize import values that are likely inflated (e.g., accidentally x100).
// Accepts multiple reference values and scales down when ratio is abnormally large.
const normalizeImportValue = (value, ...referenceValues) => {
    const numeric = normalizeMoney(value);
    const references = referenceValues
        .map((ref) => normalizeMoney(ref))
        .filter((ref) => Number.isFinite(ref) && ref > 0);

    for (const reference of references) {
        const ratio = numeric / reference;
        const shouldScaleDown =
            ratio >= 40 && ratio <= 150 && numeric % 100 === 0;
        if (shouldScaleDown) {
            return {
                value: Math.round(numeric / 100),
                scaled: true,
                reference,
            };
        }
    }

    return { value: numeric, scaled: false, reference: null };
};

const roundToThousands = (value) => {
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric) || numeric === 0) return 0;
    const remainder = numeric % 1000;
    if (remainder === 0) return numeric;
    return remainder >= 500 ? numeric + (1000 - remainder) : numeric - remainder;
};

const formatCurrency = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0";
    try {
        return num.toLocaleString("vi-VN");
    } catch {
        return String(num);
    }
};

const calcGiaBan = ({
    orderId,
    giaNhap,
    priceMax,
    pctCtv,
    pctKhach,
    giaBanFallback,
}) => {
    const code = String(orderId || "").toUpperCase();
    const normalizePct = (val) => {
        const num = Number(val);
        if (!Number.isFinite(num) || num <= 0) return 1;
        // Nếu nhập 125 nghĩa là 125% -> 1.25
        if (num > 10) return num / 100;
        return num;
    };
    const pctC = normalizePct(pctCtv);
    const pctK = normalizePct(pctKhach);
    const basePrice =
        Number.isFinite(Number(priceMax)) && Number(priceMax) > 0 ?
        Number(priceMax) :
        Number.isFinite(Number(giaNhap)) ?
        Number(giaNhap) :
        0;
    const fallback =
        Number.isFinite(Number(giaBanFallback)) && Number(giaBanFallback) > 0 ?
        Number(giaBanFallback) :
        Number.isFinite(Number(giaNhap)) ?
        Number(giaNhap) :
        basePrice;

    try {
        if (ORDER_PREFIXES?.ctv && code.startsWith(ORDER_PREFIXES.ctv)) {
            return basePrice * pctC;
        }
        if (ORDER_PREFIXES?.le && code.startsWith(ORDER_PREFIXES.le)) {
            return basePrice * pctC * pctK;
        }
        if (code.startsWith("MAVK")) {
            return Number.isFinite(Number(giaNhap)) ? Number(giaNhap) : fallback;
        }
        if (ORDER_PREFIXES?.thuong && code.startsWith(ORDER_PREFIXES.thuong)) {
            return basePrice || fallback;
        }
        return basePrice || fallback;
    } catch (err) {
        console.error("Error calculating gia_ban for %s: %s", orderId, err);
        return basePrice || fallback;
    }
};

const extractOrderCodes = (transaction) => {
    const fields = [
        transaction?.transaction_content,
        transaction?.note,
        transaction?.description,
    ];
    const codes = new Set();
    for (const text of fields) {
        if (!text) continue;
        const matches = String(text).match(/MAV\w{3,}/gi);
        if (matches) {
            matches.forEach((m) => codes.add(m.toUpperCase()));
        }
    }
    return Array.from(codes);
};

const deriveOrderCode = (transaction) => {
    const codes = extractOrderCodes(transaction);
    const [fromSplit] = splitTransactionContent(transaction?.transaction_content);
    return (codes[0] || fromSplit || "").trim();
};

const fetchProductPricing = async(client, productName) => {
    const sql = `
    SELECT ${PRODUCT_PRICE_COLS.id}, ${PRODUCT_PRICE_COLS.pctCtv}, ${PRODUCT_PRICE_COLS.pctKhach}
    FROM ${PRODUCT_PRICE_TABLE}
    WHERE LOWER(${PRODUCT_PRICE_COLS.product}) = LOWER($1)
    LIMIT 1
  `;
    const res = await client.query(sql, [productName]);
    if (!res.rows.length) return { productId: null, pctCtv: 1, pctKhach: 1 };
    const row = res.rows[0];
    return {
        productId: row[PRODUCT_PRICE_COLS.id],
        pctCtv: row[PRODUCT_PRICE_COLS.pctCtv] ?? 1,
        pctKhach: row[PRODUCT_PRICE_COLS.pctKhach] ?? 1,
    };
};

const findSupplyId = async(client, supplyName) => {
    if (!supplyName) return null;
    const sql = `
    SELECT ${SUPPLY_COLS.id}
    FROM ${SUPPLY_TABLE}
    WHERE LOWER(${SUPPLY_COLS.sourceName}) = LOWER($1)
    LIMIT 1
  `;
    const res = await client.query(sql, [String(supplyName).trim()]);
    return res.rows.length ? res.rows[0][SUPPLY_COLS.id] : null;
};

const fetchSupplyPrice = async(client, productId, sourceId) => {
    if (!(productId && sourceId)) return null;
    const sql = `
    SELECT ${SUPPLY_PRICE_COLS.price}
    FROM ${SUPPLY_PRICE_TABLE}
    WHERE ${SUPPLY_PRICE_COLS.productId} = $1 AND ${SUPPLY_PRICE_COLS.sourceId} = $2
    ORDER BY ${SUPPLY_PRICE_COLS.id} DESC
    LIMIT 1
  `;
    const res = await client.query(sql, [productId, sourceId]);
    return res.rows.length ? res.rows[0][SUPPLY_PRICE_COLS.price] : null;
};

const fetchMaxSupplyPrice = async(client, productId) => {
    if (!productId) return null;
    const res = await client.query(
        `SELECT MAX(${SUPPLY_PRICE_COLS.price}) AS price
       FROM ${SUPPLY_PRICE_TABLE}
       WHERE ${SUPPLY_PRICE_COLS.productId} = $1`, [productId]
    );
    return res.rows.length ? res.rows[0].price : null;
};

const ensureSupplyAndPriceFromOrder = async(orderCode, options = {}) => {
    if (!orderCode) return null;
    const referenceImport = normalizeMoney(options.referenceImport);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const orderRes = await client.query(
            `SELECT
        ${ORDER_COLS.idProduct} AS product_name,
        ${ORDER_COLS.supply} AS supply_name,
        ${ORDER_COLS.cost} AS cost_value
      FROM ${ORDER_TABLE}
      WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
      LIMIT 1`, [orderCode]
        );

        if (!orderRes.rows.length) {
            await client.query("ROLLBACK");
            return null;
        }

        const productName = String(orderRes.rows[0].product_name || "").trim();
        const supplyName = String(orderRes.rows[0].supply_name || "").trim();
        const costValue = normalizeMoney(orderRes.rows[0].cost_value);

        let productId = null;
        if (productName) {
            const productRes = await client.query(
                `SELECT ${PRODUCT_PRICE_COLS.id} AS id
         FROM ${PRODUCT_PRICE_TABLE}
         WHERE LOWER(${PRODUCT_PRICE_COLS.product}) = LOWER($1)
         LIMIT 1`, [productName]
            );

            if (productRes.rows.length) {
                productId = productRes.rows[0].id;
            } else {
                const insertProduct = await client.query(
                    `INSERT INTO ${PRODUCT_PRICE_TABLE} (${PRODUCT_PRICE_COLS.product})
           VALUES ($1)
           RETURNING ${PRODUCT_PRICE_COLS.id} AS id`, [productName]
                );
                productId = insertProduct.rows[0].id;
            }
        }

        let sourceId = null;
        if (supplyName) {
            const supplyRes = await client.query(
                `SELECT ${SUPPLY_COLS.id} AS id
         FROM ${SUPPLY_TABLE}
         WHERE LOWER(${SUPPLY_COLS.sourceName}) = LOWER($1)
         LIMIT 1`, [supplyName]
            );

            if (supplyRes.rows.length) {
                sourceId = supplyRes.rows[0].id;
            } else {
                const insertSupply = await client.query(
                    `INSERT INTO ${SUPPLY_TABLE} (${SUPPLY_COLS.sourceName})
           VALUES ($1)
           RETURNING ${SUPPLY_COLS.id} AS id`, [supplyName]
                );
                sourceId = insertSupply.rows[0].id;
            }
        }

        let supplyPriceValue = costValue || referenceImport || 0;
        let supplyPriceScaled = false;
        let rawSupplyPrice = null;
        if (productId && sourceId) {
            const priceRes = await client.query(
                `SELECT ${SUPPLY_PRICE_COLS.price} AS price
         FROM ${SUPPLY_PRICE_TABLE}
         WHERE ${SUPPLY_PRICE_COLS.productId} = $1
           AND ${SUPPLY_PRICE_COLS.sourceId} = $2
         ORDER BY ${SUPPLY_PRICE_COLS.id} DESC
         LIMIT 1`, [productId, sourceId]
            );

            if (priceRes.rows.length) {
                rawSupplyPrice = normalizeMoney(priceRes.rows[0].price);
                const normalized = normalizeImportValue(
                    rawSupplyPrice,
                    costValue,
                    referenceImport
                );
                supplyPriceValue = normalized.value;
                supplyPriceScaled = normalized.scaled;
                if (supplyPriceScaled && rawSupplyPrice !== supplyPriceValue) {
                    try {
                        await client.query(
                            `UPDATE ${SUPPLY_PRICE_TABLE}
               SET ${SUPPLY_PRICE_COLS.price} = $1
             WHERE ${SUPPLY_PRICE_COLS.productId} = $2
               AND ${SUPPLY_PRICE_COLS.sourceId} = $3`, [supplyPriceValue, productId, sourceId]
                        );
                    } catch (adjustErr) {
                        console.error(
                            "Failed to normalize supply_price for productId=%s, sourceId=%s:",
                            productId,
                            sourceId,
                            adjustErr
                        );
                    }
                }
            } else {
                try {
                    const insertPrice = supplyPriceValue || referenceImport || costValue;
                    await client.query(
                        `INSERT INTO ${SUPPLY_PRICE_TABLE} (${SUPPLY_PRICE_COLS.productId}, ${SUPPLY_PRICE_COLS.sourceId}, ${SUPPLY_PRICE_COLS.price})
             VALUES ($1, $2, $3)
             ON CONFLICT ON CONSTRAINT supply_price_pkey DO NOTHING`, [productId, sourceId, insertPrice]
                    );
                } catch (insertErr) {
                    console.error(
                        "Insert supply_price failed, productId=%s, sourceId=%s:",
                        productId,
                        sourceId,
                        insertErr
                    );
                }
                supplyPriceValue = supplyPriceValue || referenceImport || costValue;
            }
        }

        await client.query("COMMIT");
        return {
            productId,
            sourceId,
            price: supplyPriceValue,
            priceScaled: supplyPriceScaled,
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const updatePaymentSupplyBalance = async(sourceId, priceValue, noteDate) => {
    if (!(sourceId && Number.isFinite(priceValue) && priceValue > 0)) return;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const latestRes = await client.query(
            `SELECT
        ${PAYMENT_SUPPLY_COLS.id} AS id,
        ${PAYMENT_SUPPLY_COLS.importValue} AS import_value,
        ${PAYMENT_SUPPLY_COLS.paid} AS paid_value,
        ${PAYMENT_SUPPLY_COLS.status} AS status_label
       FROM ${PAYMENT_SUPPLY_TABLE}
       WHERE ${PAYMENT_SUPPLY_COLS.sourceId} = $1
       ORDER BY ${PAYMENT_SUPPLY_COLS.id} DESC
       LIMIT 1`, [sourceId]
        );

        const formatNote = () => {
            const dt = noteDate instanceof Date ? noteDate : new Date();
            const day = String(dt.getDate()).padStart(2, "0");
            const month = String(dt.getMonth() + 1).padStart(2, "0");
            const year = dt.getFullYear();
            return `${day}/${month}/${year}`;
        };

        const latest = latestRes.rows[0];
        const statusNorm = stripAccents(latest?.status_label || "")
            .toLowerCase()
            .trim();
        const paidIsNull =
            latest && (latest.paid_value === null || latest.paid_value === undefined);

        if (latest && statusNorm === "chua thanh toan" && paidIsNull) {
            await client.query(
                `UPDATE ${PAYMENT_SUPPLY_TABLE}
         SET ${PAYMENT_SUPPLY_COLS.importValue} = COALESCE(${PAYMENT_SUPPLY_COLS.importValue}, 0) + $2
         WHERE ${PAYMENT_SUPPLY_COLS.id} = $1`, [latest.id, priceValue]
            );
        } else {
            await client.query(
                `INSERT INTO ${PAYMENT_SUPPLY_TABLE} (
            ${PAYMENT_SUPPLY_COLS.sourceId},
            ${PAYMENT_SUPPLY_COLS.importValue},
            ${PAYMENT_SUPPLY_COLS.round},
            ${PAYMENT_SUPPLY_COLS.status},
            ${PAYMENT_SUPPLY_COLS.paid}
          )
          VALUES ($1, $2, $3, 'Chưa Thanh Toán', NULL)`, [sourceId, priceValue, formatNote()]
            );
        }

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const runRenewal = async(orderCode, { forceRenewal = false } = {}) => {
    if (!orderCode) {
        return { success: false, details: "Thieu ma don hang", processType: "error" };
    }

    const client = await pool.connect();
    try {
        const orderRes = await client.query(
            `SELECT
        ${ORDER_COLS.idProduct},
        ${ORDER_COLS.orderExpired},
        ${ORDER_COLS.supply},
        ${ORDER_COLS.cost},
        ${ORDER_COLS.price},
        ${ORDER_COLS.informationOrder},
        ${ORDER_COLS.slot},
        ${ORDER_COLS.orderDate},
        ${ORDER_COLS.status},
        ${ORDER_COLS.checkFlag}
      FROM ${ORDER_TABLE}
      WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
      LIMIT 1`, [orderCode]
        );

        if (!orderRes.rows.length) {
            return {
                success: false,
                details: `Khong tim thay don ${orderCode}`,
                processType: "error",
            };
        }

        const order = orderRes.rows[0];
        const sanPham = order[ORDER_COLS.idProduct];
        const hetHan = parseFlexibleDate(order[ORDER_COLS.orderExpired]);
        const nguon = order[ORDER_COLS.supply];
        const giaNhapCu = normalizeMoney(order[ORDER_COLS.cost]);
        const giaBanCu = normalizeMoney(order[ORDER_COLS.price]);
        const thongTin = order[ORDER_COLS.informationOrder];
        const slot = order[ORDER_COLS.slot];

        if (!hetHan) {
            return {
                success: false,
                details: `Ngay het han khong hop le cho ${orderCode}`,
                processType: "error",
            };
        }

        const daysLeft = Math.floor((hetHan.getTime() - Date.now()) / 86_400_000);
        if (!forceRenewal && daysLeft > 4) {
            return {
                success: false,
                details: `Bo qua, con ${daysLeft} ngay`,
                processType: "skipped",
            };
        }

        const productNormalized = normalizeProductDuration(sanPham || "");
        const months = monthsFromString(productNormalized);
        if (!months) {
            return {
                success: false,
                details: "Khong xac dinh thoi han san pham",
                processType: "error",
            };
        }

        const fallbackSoNgay = months * 30;

        const { productId, pctCtv, pctKhach } = await fetchProductPricing(
            client,
            sanPham
        );
        const sourceId = await findSupplyId(client, nguon);
        const giaNhapSource = await fetchSupplyPrice(client, productId, sourceId);
        const maxPriceRow = await fetchMaxSupplyPrice(client, productId);

        // Chống x100: scale dựa trên giá cũ nếu có
        const normalizedNhap = normalizeImportValue(
            giaNhapSource,
            giaNhapCu || undefined
        );
        const latestGiaNhap =
            normalizedNhap && Number.isFinite(normalizedNhap.value) ?
            normalizedNhap.value :
            (giaNhapSource !== null && giaNhapSource !== undefined ? normalizeMoney(giaNhapSource) : giaNhapCu);

        // Chống x100 cho priceMax: so với giá nhập đã normalize / giá cũ
        const normalizedPriceMax = normalizeImportValue(
            maxPriceRow,
            latestGiaNhap || giaNhapCu || undefined
        );
        const priceMax =
            normalizedPriceMax && Number.isFinite(normalizedPriceMax.value) ?
            normalizedPriceMax.value :
            normalizeMoney(maxPriceRow);

        const effectivePriceMax =
            priceMax > 0 ? priceMax : giaBanCu || latestGiaNhap;

        const finalGiaBanRaw = calcGiaBan({
            orderId: orderCode,
            giaNhap: latestGiaNhap,
            priceMax: effectivePriceMax,
            pctCtv,
            pctKhach,
            giaBanFallback: giaBanCu,
        });

        const finalGiaNhap = latestGiaNhap;
        const finalGiaBan = roundToThousands(finalGiaBanRaw || effectivePriceMax);

        const ngayHetHanCu = new Date(hetHan.getTime());
        ngayHetHanCu.setHours(0, 0, 0, 0);
        const ngayBatDauMoi = addDays(ngayHetHanCu, 1);
        const ngayHetHanTheoThang = addMonthsClamped(ngayBatDauMoi, months);
        const ngayHetHanMoi = addDays(ngayHetHanTheoThang, -1);
        const soNgayGiaHan = Math.max(
            1,
            Math.round((ngayHetHanMoi.getTime() - ngayBatDauMoi.getTime()) / 86_400_000) + 1
        );

        console.log("[Renewal] Calculated span", {
            orderCode,
            months,
            fallbackSoNgay,
            soNgayGiaHan,
            start: formatDateDMY(ngayBatDauMoi),
            expired: formatDateDMY(ngayHetHanMoi),
            giaNhap: finalGiaNhap,
            giaBan: finalGiaBan,
            priceMax: effectivePriceMax,
            rawGiaNhap: giaNhapSource,
            rawPriceMax: maxPriceRow,
            normalizedGiaNhap: normalizedNhap,
            normalizedPriceMax,
            pctCtv,
            pctKhach,
            pctCtvNormalized: Number.isFinite(Number(pctCtv)) && Number(pctCtv) > 10 ? Number(pctCtv) / 100 : Number(pctCtv) || 1,
            pctKhachNormalized: Number.isFinite(Number(pctKhach)) && Number(pctKhach) > 10 ? Number(pctKhach) / 100 : Number(pctKhach) || 1,
            sourceId,
            productId,
            status: order[ORDER_COLS.status],
            checkFlag: order[ORDER_COLS.checkFlag],
        });

        const updateSql = `
      UPDATE ${ORDER_TABLE}
      SET
        ${ORDER_COLS.orderDate} = $1,
        ${ORDER_COLS.days} = $2,
        ${ORDER_COLS.orderExpired} = $3,
        ${ORDER_COLS.cost} = $4,
        ${ORDER_COLS.price} = $5,
        ${ORDER_COLS.status} = $6,
        ${ORDER_COLS.checkFlag} = $7
      WHERE ${ORDER_COLS.idOrder} = $8
    `;

        await client.query(updateSql, [
            formatDateDB(ngayBatDauMoi),
            soNgayGiaHan,
            formatDateDB(ngayHetHanMoi),
            finalGiaNhap,
            finalGiaBan,
            "Chưa Thanh Toán",
            false,
            orderCode,
        ]);

        if (sourceId && Number.isFinite(finalGiaNhap) && finalGiaNhap > 0) {
            try {
                await updatePaymentSupplyBalance(sourceId, finalGiaNhap, ngayBatDauMoi);
            } catch (balanceErr) {
                console.error("Failed to update payment_supply for %s:", orderCode, balanceErr);
            }
        }

        const details = {
            ID_DON_HANG: orderCode,
            SAN_PHAM: sanPham,
            THONG_TIN_DON: thongTin,
            SLOT: slot,
            NGAY_DANG_KY: formatDateDMY(ngayBatDauMoi),
            HET_HAN: formatDateDMY(ngayHetHanMoi),
            NGUON: nguon,
            GIA_NHAP: finalGiaNhap,
            GIA_BAN: finalGiaBan,
            TINH_TRANG: "Chưa Thanh Toán",
        };

        return { success: true, details, processType: "renewal" };
    } catch (err) {
        console.error("Error renewing order %s: %s", orderCode, err);
        return { success: false, details: err.message || String(err), processType: "error" };
    } finally {
        client.release();
    }
};

const postJson = (url, data) =>
    new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);

        if (typeof fetch === "function") {
            fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload,
                })
                .then(resolve)
                .catch(reject);
            return;
        }

        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + (parsed.search || ""),
            port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
            },
        };

        const req = https.request(options, (res) => {
            res.on("data", () => {});
            res.on("end", resolve);
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });

const buildRenewalMessage = (orderCode, result) => {
        if (!result) return `Don ${orderCode}: Khong co ket qua gia han`;
        const status = result.success ?
            "Gia Hạn Thành Công" :
            result.processType === "skipped" ?
            "Bỏ Qua" :
            "Lỗi Gia Hạn";

        if (!result.details || typeof result.details !== "object") {
            return `Đơn ${orderCode}: ${status}${result.details ? ` - ${result.details}` : ""}`;
  }

  const d = result.details;
  const lines = [
    `Đơn ${orderCode}: ${status}`,
    `- Sản Phẩm: ${d.SAN_PHAM || ""}`,
    `- Thông Tin: ${d.THONG_TIN_DON || ""}`,
    d.SLOT ? `- Slot: ${d.SLOT}` : null,
    `- Ngày Đăng Ký: ${d.NGAY_DANG_KY || ""}`,
    `- Hết Hạn: ${d.HET_HAN || ""}`,
    `- Giá Bán: ${formatCurrency(d.GIA_BAN)}`,
    `- Giá Nhập: ${formatCurrency(d.GIA_NHAP)}`,
  ].filter(Boolean);
  return lines.join("\n");
};

const sendRenewalNotification = async (orderCode, renewalResult) => {
  if (
    !renewalResult ||
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHAT_ID ||
    !SEND_RENEWAL_TO_TOPIC
  ) {
    return;
  }

  const text = buildRenewalMessage(orderCode, renewalResult);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
  };
  if (Number.isFinite(TELEGRAM_TOPIC_ID)) {
    payload.message_thread_id = TELEGRAM_TOPIC_ID;
  }

  try {
    await postJson(url, payload);
  } catch (err) {
    console.error("Failed to send Telegram renewal notification:", err);
  }
};

const buildPaymentMessage = (orderCode, transaction) => {
  if (!transaction) return "";
  const amount = normalizeAmount(
    transaction.transfer_amount || transaction.amount_in
  );
  const paidDate = parsePaidDate(
    transaction.transaction_date || transaction.transaction_date_raw
  );
  const receiverAccount =
    transaction.account_number || transaction.accountNumber || "";
  const content =
    transaction.description ||
    transaction.transaction_content ||
    transaction.note ||
    "";
  const senderParsed = extractSenderFromContent(
    transaction.transaction_content || transaction.description
  );

  const parts = [
    `[THU TIEN] ${orderCode || "Khong ro don"}`,
    `- So tien: ${formatCurrency(amount)}`,
    `- Ngay: ${paidDate}`,
    senderParsed ? `- Nguoi gui: ${senderParsed}` : null,
    receiverAccount ? `- Tai khoan nhan: ${receiverAccount}` : null,
    content ? `- Noi dung: ${content}` : null,
  ].filter(Boolean);

  return parts.join("\n");
};

const sendPaymentNotification = async (orderCode, transaction) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const text = buildPaymentMessage(orderCode, transaction);
  if (!text) return;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
  };
  if (Number.isFinite(TELEGRAM_TOPIC_ID)) {
    payload.message_thread_id = TELEGRAM_TOPIC_ID;
  }

  try {
    await postJson(url, payload);
  } catch (err) {
    console.error("Failed to send Telegram payment notification:", err);
  }
};

// ------------------------------
// Renewal retry state (in-memory)
// ------------------------------
const pendingRenewalTasks = new Map(); // orderCode -> task state

const isTelegramEnabled = () =>
  Boolean(
    TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && SEND_RENEWAL_TO_TOPIC !== false
  );

const isEligibleForRenewal = (statusValue, checkFlag, orderExpired) => {
  const statusNorm = stripAccents(statusValue || "").toLowerCase().trim();
  const daysLeft = daysUntil(orderExpired);

  const readyForRenew =
    (statusNorm === "can gia han" || statusNorm === "het han") &&
    isNullishFlag(checkFlag) &&
    daysLeft <= 4;

  const paidNeedsForce = statusNorm === "da thanh toan" && isTrueFlag(checkFlag);

  return {
    eligible: readyForRenew || paidNeedsForce,
    forceRenewal: paidNeedsForce,
    needsStatusReset: paidNeedsForce,
    daysLeft,
    statusNorm,
  };
};

const queueRenewalTask = (orderCode, options = {}) => {
  if (!orderCode) return null;
  const key = orderCode.trim();
  if (!key) return null;
  const existing = pendingRenewalTasks.get(key) || {};
  const task = {
    orderCode: key,
    renewalDone: existing.renewalDone || false,
    telegramDone: existing.telegramDone || false,
    statusResetDone: existing.statusResetDone || false,
    lastRenewalResult: existing.lastRenewalResult || null,
    renewalAttempts: existing.renewalAttempts || 0,
    telegramAttempts: existing.telegramAttempts || 0,
    lastError: existing.lastError || null,
    forceRenewal: existing.forceRenewal || options.forceRenewal || false,
    needsStatusReset: existing.needsStatusReset || options.needsStatusReset || false,
  };
  pendingRenewalTasks.set(key, task);
  return task;
};

const processRenewalTask = async (orderCode) => {
  const task = pendingRenewalTasks.get(orderCode);
  if (!task) return null;

  const state = await fetchOrderState(orderCode);
  if (!state) {
    pendingRenewalTasks.delete(orderCode);
    return { orderCode, skipped: true, reason: "not found" };
  }

  const { eligible, forceRenewal, needsStatusReset } = isEligibleForRenewal(
    state[ORDER_COLS.status],
    state[ORDER_COLS.checkFlag],
    state[ORDER_COLS.orderExpired]
  );

  if (!eligible) {
    pendingRenewalTasks.delete(orderCode);
    return { orderCode, skipped: true, reason: "not eligible" };
  }

  // Run renewal only if not already successful
  if (!task.renewalDone) {
    try {
      const renewalResult = await runRenewal(orderCode, {
        forceRenewal: task.forceRenewal || forceRenewal,
      });
      task.renewalAttempts += 1;
      task.lastRenewalResult = renewalResult;
      task.renewalDone = !!renewalResult?.success;
      task.lastError = task.renewalDone
        ? null
        : renewalResult?.details || "Renewal failed";
    } catch (err) {
      task.renewalAttempts += 1;
      task.lastError = err?.message || String(err);
      return {
        orderCode,
        success: false,
        error: task.lastError,
        renewalDone: false,
        telegramDone: task.telegramDone,
      };
    }
  }

  // Optional status reset after forced renewal
  if (task.renewalDone && needsStatusReset && !task.statusResetDone) {
    try {
      await setStatusUnpaid(orderCode);
      task.statusResetDone = true;
    } catch (err) {
      task.lastError = err?.message || String(err);
      return {
        orderCode,
        success: false,
        error: task.lastError,
        renewalDone: true,
        telegramDone: task.telegramDone,
      };
    }
  }

  // Telegram notification only if renewal succeeded and not yet sent
  if (task.renewalDone && !task.telegramDone) {
    if (!isTelegramEnabled()) {
      task.telegramDone = true; // Nothing to send; consider done
    } else {
      try {
        await sendRenewalNotification(orderCode, task.lastRenewalResult);
        task.telegramAttempts += 1;
        task.telegramDone = true;
        task.lastError = null;
      } catch (err) {
        task.telegramAttempts += 1;
        task.lastError = err?.message || String(err);
        return {
          orderCode,
          success: false,
          error: task.lastError,
          renewalDone: true,
          telegramDone: false,
        };
      }
    }
  }

  const success = task.renewalDone && task.telegramDone;
  if (success) {
    pendingRenewalTasks.delete(orderCode);
  } else {
    pendingRenewalTasks.set(orderCode, task);
  }

  return {
    orderCode,
    success,
    renewalDone: task.renewalDone,
    telegramDone: task.telegramDone,
    lastError: task.lastError,
  };
};

// Find orders that need renewal based on status/checkFlag/expiry window
const fetchRenewalCandidates = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT
        ${ORDER_COLS.idOrder} AS order_code,
        ${ORDER_COLS.status} AS status_value,
        ${ORDER_COLS.checkFlag} AS check_flag_value,
        ${ORDER_COLS.orderExpired} AS order_expired_value
      FROM ${ORDER_TABLE}
      WHERE TRIM(${ORDER_COLS.idOrder}::text) <> ''`
    );

    const candidates = [];
    for (const row of res.rows) {
      const orderCode = (row.order_code || "").trim();
      if (!orderCode) continue;
      const eligibility = isEligibleForRenewal(
        row.status_value,
        row.check_flag_value,
        row.order_expired_value
      );

      if (eligibility.eligible) {
        candidates.push({
          orderCode,
          forceRenewal: eligibility.forceRenewal,
          daysLeft: eligibility.daysLeft,
          status: eligibility.statusNorm,
          needsStatusReset: eligibility.needsStatusReset,
        });
      }
    }
    return candidates;
  } finally {
    client.release();
  }
};

const runRenewalBatch = async ({ orderCodes, forceRenewal = false } = {}) => {
  const targets =
    Array.isArray(orderCodes) && orderCodes.length
      ? orderCodes
          .map((code) => ({
            orderCode: String(code || "").trim(),
            forceRenewal,
          }))
          .filter((c) => c.orderCode)
      : await fetchRenewalCandidates();

  // Queue tasks
  for (const target of targets) {
    queueRenewalTask(target.orderCode, {
      forceRenewal: target.forceRenewal,
      needsStatusReset: target.needsStatusReset,
    });
  }

  // Process tasks
  const results = [];
  for (const target of targets) {
    const code = target.orderCode;
    if (!code) continue;
    const outcome = await processRenewalTask(code);
    if (outcome) {
      results.push(outcome);
    }
  }

  const succeeded = results.filter((r) => r?.success).length;
  return {
    total: targets.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
};

const fetchOrderState = async (orderCode) => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT
        ${ORDER_COLS.status},
        ${ORDER_COLS.checkFlag},
        ${ORDER_COLS.orderExpired}
      FROM ${ORDER_TABLE}
      WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
      LIMIT 1`,
      [orderCode]
    );
    return res.rows[0] || null;
  } finally {
    client.release();
  }
};

const markCheckFlagFalse = async (orderCode) => {
  const sql = `
    UPDATE ${ORDER_TABLE}
    SET ${ORDER_COLS.checkFlag} = FALSE
    WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
      AND ${ORDER_COLS.checkFlag} IS NULL
  `;
  await pool.query(sql, [orderCode]);
};

const setStatusUnpaid = async (orderCode) => {
  const sql = `
    UPDATE ${ORDER_TABLE}
    SET ${ORDER_COLS.status} = 'Chua Thanh Toan',
        ${ORDER_COLS.checkFlag} = FALSE
    WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
  `;
  await pool.query(sql, [orderCode]);
};

const isNullishFlag = (value) =>
  value === null || value === undefined || value === "" || value === "null";

const isTrueFlag = (value) => {
  if (value === true) return true;
  if (value === 1 || value === "1") return true;
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
};

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

// Health check for webhook endpoint
app.get(SEPAY_WEBHOOK_PATH, (_req, res) => {
  res.json({ message: "Sepay webhook endpoint. Use POST with signature." });
});

// Manual retry renewals (requires Sepay API key header)
app.post("/api/renewals/retry", async (req, res) => {
  if (!isValidApiKey(req)) {
    return res.status(403).json({ message: "Invalid API key" });
  }

  try {
    const { orders, force } = req.body || {};
    const summary = await runRenewalBatch({
      orderCodes: Array.isArray(orders) ? orders : undefined,
      forceRenewal: Boolean(force),
    });
    res.json({ message: "OK", ...summary });
  } catch (err) {
    console.error("Renewal retry failed:", err);
    res.status(500).json({ message: "Internal Error" });
  }
});

app.post(SEPAY_WEBHOOK_PATH, async (req, res) => {
  console.log("Incoming Sepay webhook headers:", {
    authorization: req.get("Authorization"),
    xApiKey: req.get("X-API-KEY"),
    xSepaySignature: req.get("X-SEPAY-SIGNATURE"),
    signature: req.get("Signature"),
    querySignature: req.query?.signature,
  });
  console.log("Incoming Sepay webhook raw body:", safeStringify(req.body));

  const signature = resolveSepaySignature(req);
  const hasValidSignature = verifySepaySignature(req.rawBody, signature);
  const hasValidApiKey = isValidApiKey(req);
  if (!(hasValidSignature || hasValidApiKey)) {
    console.error("Webhook auth failed", {
      hasValidSignature,
      hasValidApiKey,
      receivedAuth: req.get("Authorization"),
    });
    return res.status(403).json({ message: "Invalid Signature" });
  }

  const transaction = normalizeTransactionPayload(req.body);
  console.log("Parsed transaction object:", safeStringify(transaction));
  if (!transaction) {
    return res.status(400).json({ message: "Missing transaction" });
  }

  const orderCode = deriveOrderCode(transaction);
  console.log("Derived order code:", orderCode);
  const transferAmountNormalized = normalizeAmount(
    transaction.transfer_amount || transaction.amount_in
  );

  try {
    await insertPaymentReceipt(transaction);
    try {
      await sendPaymentNotification(orderCode, transaction);
    } catch (notifyErr) {
      console.error("Payment notification failed:", notifyErr);
    }
    const ensured = await ensureSupplyAndPriceFromOrder(orderCode, {
      referenceImport: transferAmountNormalized,
    });
    console.log("Ensure supply/price result:", safeStringify(ensured));
    if (ensured?.sourceId && Number.isFinite(ensured.price)) {
      await updatePaymentSupplyBalance(ensured.sourceId, ensured.price, new Date());
    }

    // Renewal retry flow: only queue and retry needed actions
    try {
      if (orderCode) {
        const state = await fetchOrderState(orderCode);
        if (state) {
          const eligibility = isEligibleForRenewal(
            state[ORDER_COLS.status],
            state[ORDER_COLS.checkFlag],
            state[ORDER_COLS.orderExpired]
          );
          if (eligibility.eligible) {
            queueRenewalTask(orderCode, {
              forceRenewal: eligibility.forceRenewal,
              needsStatusReset: eligibility.needsStatusReset,
            });
            await processRenewalTask(orderCode);
          } else if (
            eligibility.statusNorm === "chua thanh toan" &&
            isNullishFlag(state[ORDER_COLS.checkFlag])
          ) {
            await markCheckFlagFalse(orderCode);
          }
        }
      }
    } catch (renewErr) {
      console.error("Renewal flow failed:", renewErr);
    }

    return res.json({ message: "OK" });
  } catch (err) {
    console.error("Error saving payment:", err);
    if (err?.stack) console.error(err.stack);
    return res.status(500).json({ message: "Internal Error" });
  }
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Listening on http://${HOST}:${PORT}${SEPAY_WEBHOOK_PATH}`);
  });
}

if (RENEWAL_CRON_ENABLED) {
  cron.schedule(
    RENEWAL_CRON_SCHEDULE,
    () => {
      console.log("[Cron] Running scheduled renewal retry job...");
      runRenewalBatch()
        .then((summary) =>
          console.log(
            `[Cron] Renewal retry done. Success: ${summary.succeeded}/${summary.total}`
          )
        )
        .catch((err) => console.error("[Cron] Renewal retry failed:", err));
    }, {
      scheduled: true,
      timezone: APP_TIMEZONE,
    }
  );
  console.log(
    `[Cron] Renewal retry scheduled: '${RENEWAL_CRON_SCHEDULE}' (${APP_TIMEZONE})`
  );
}

module.exports = app;
module.exports.runRenewal = runRenewal;
module.exports.queueRenewalTask = queueRenewalTask;
module.exports.processRenewalTask = processRenewalTask;
module.exports.fetchOrderState = fetchOrderState;
module.exports.sendRenewalNotification = sendRenewalNotification;
