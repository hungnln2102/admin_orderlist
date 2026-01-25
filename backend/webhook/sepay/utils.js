/* Utility helpers for Sepay webhook */
const { monthsFromString, ORDER_PREFIXES } = require("../../helpers");
const {
  pool,
  ORDER_COLS,
  PAYMENT_RECEIPT_COLS,
  VARIANT_COLS,
  PRICE_CONFIG_COLS,
  SUPPLIER_COLS,
  SUPPLIER_COST_COLS,
  VARIANT_TABLE,
  PRICE_CONFIG_TABLE,
  SUPPLIER_TABLE,
  SUPPLIER_COST_TABLE,
} = require("./config");

const stripAccents = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

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

const safeIdent = (value) => `"${String(value || "").replace(/"/g, '""')}"`;

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
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
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
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  const text = String(value ?? "").trim();
  if (!text) return 0;

  const normalized = text.replace(/,/g, "").replace(/\s+/g, "");
  const asNumber = Number.parseFloat(normalized);
  if (Number.isFinite(asNumber)) {
    return Math.round(asNumber);
  }

  const digits = normalized.replace(/[^\d-]/g, "");
  const numeric = Number.parseInt(digits || "0", 10);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeImportValue = (value, ...referenceValues) => {
  const numeric = normalizeMoney(value);
  const references = referenceValues
    .map((ref) => normalizeMoney(ref))
    .filter((ref) => Number.isFinite(ref) && ref > 0);

  for (const reference of references) {
    const ratio = numeric / reference;
    const shouldScaleDown = ratio >= 40 && ratio <= 150 && numeric % 100 === 0;
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

const calcGiaBan = ({ orderId, giaNhap, priceMax, pctCtv, pctKhach, giaBanFallback, pctPromo }) => {
  const code = String(orderId || "").toUpperCase();
  const normalizePct = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num) || num <= 0) return 1;
    if (num > 10) return num / 100;
    return num;
  };
  const pctC = normalizePct(pctCtv);
  const pctK = normalizePct(pctKhach);
  const promoNormRaw = Number(pctPromo);
  const promoNorm =
    Number.isFinite(promoNormRaw) && promoNormRaw > 0
      ? promoNormRaw > 1
        ? promoNormRaw / 100
        : promoNormRaw
      : 0;
  const basePrice =
    Number.isFinite(Number(priceMax)) && Number(priceMax) > 0
      ? Number(priceMax)
      : Number.isFinite(Number(giaNhap))
      ? Number(giaNhap)
      : 0;
  const fallback =
    Number.isFinite(Number(giaBanFallback)) && Number(giaBanFallback) > 0
      ? Number(giaBanFallback)
      : Number.isFinite(Number(giaNhap))
      ? Number(giaNhap)
      : basePrice;

  try {
    if (ORDER_PREFIXES?.ctv && code.startsWith(ORDER_PREFIXES.ctv)) {
      return basePrice * pctC;
    }
    if (ORDER_PREFIXES?.le && code.startsWith(ORDER_PREFIXES.le)) {
      return basePrice * pctC * pctK;
    }
    if (ORDER_PREFIXES?.khuyen && code.startsWith(ORDER_PREFIXES.khuyen)) {
      if (promoNorm > 0) {
        const factor = Math.max(0, 1 - promoNorm);
        return basePrice * pctC * pctK * factor;
      }
      // No promo -> behave like MAVL (customer price)
      return basePrice * pctC * pctK;
    }
    if (ORDER_PREFIXES?.tang && code.startsWith(ORDER_PREFIXES.tang)) {
      return 0;
    }
    if (ORDER_PREFIXES?.nhap && code.startsWith(ORDER_PREFIXES.nhap)) {
      return Number.isFinite(Number(giaNhap)) ? Number(giaNhap) : basePrice || fallback;
    }
    return basePrice || fallback;
  } catch (err) {
    const logger = require("../../src/utils/logger");
    logger.error("Error calculating gia_ban", { orderId, error: err?.message, stack: err?.stack });
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

const fetchProductPricing = async (client, productName) => {
  const name = String(productName ?? "");
  if (!name) {
    return { productId: null, variantId: null, pctCtv: 1, pctKhach: 1, pctPromo: 0 };
  }

  // Resolve pricing from product schema: variant.display_name -> price_config
  const variantSql = `
    SELECT
      v.${safeIdent(VARIANT_COLS.id)} AS variant_id,
      pc.${safeIdent(PRICE_CONFIG_COLS.pctCtv)} AS pct_ctv,
      pc.${safeIdent(PRICE_CONFIG_COLS.pctKhach)} AS pct_khach,
      pc.${safeIdent(PRICE_CONFIG_COLS.pctPromo)} AS pct_promo
    FROM ${VARIANT_TABLE} AS v
    LEFT JOIN ${PRICE_CONFIG_TABLE} AS pc
      ON pc.${safeIdent(PRICE_CONFIG_COLS.variantId)} = v.${safeIdent(VARIANT_COLS.id)}
    WHERE v.${safeIdent(VARIANT_COLS.displayName)} = $1
    ORDER BY pc.${safeIdent(PRICE_CONFIG_COLS.updatedAt)} DESC NULLS LAST
    LIMIT 1
  `;
  const variantRes = await client.query(variantSql, [name]);
  const variantRow = variantRes.rows[0] || {};

  return {
    productId: variantRow.variant_id ?? null, // supply_price now keyed by variant.id
    variantId: variantRow.variant_id ?? null,
    pctCtv: variantRow.pct_ctv ?? 1,
    pctKhach: variantRow.pct_khach ?? 1,
    pctPromo: variantRow.pct_promo ?? 0,
  };
};

const findSupplyId = async (client, supplyName) => {
  if (!supplyName) return null;
  const sql = `
    SELECT ${SUPPLIER_COLS.id}
    FROM ${SUPPLIER_TABLE}
    WHERE LOWER(${SUPPLIER_COLS.supplierName}) = LOWER($1)
    LIMIT 1
  `;
  const res = await client.query(sql, [String(supplyName).trim()]);
  return res.rows.length ? res.rows[0][SUPPLIER_COLS.id] : null;
};

const fetchSupplyPrice = async (client, identifiers, supplierId) => {
  const variantId = identifiers?.variantId ?? identifiers?.productId;
  if (!supplierId) return null;
  const candidateIds = [variantId].filter((id) => Number.isFinite(Number(id)));
  for (const pid of candidateIds) {
    const sql = `
      SELECT ${SUPPLIER_COST_COLS.price}
      FROM ${SUPPLIER_COST_TABLE}
      WHERE ${SUPPLIER_COST_COLS.productId} = $1 AND ${SUPPLIER_COST_COLS.supplierId} = $2
      ORDER BY ${SUPPLIER_COST_COLS.id} DESC
      LIMIT 1
    `;
    const res = await client.query(sql, [pid, supplierId]);
    if (res.rows.length) return res.rows[0][SUPPLIER_COST_COLS.price];
  }
  return null;
};

const fetchMaxSupplyPrice = async (client, identifiers) => {
  const variantId = identifiers?.variantId ?? identifiers?.productId;
  const candidateIds = [variantId].filter((id) => Number.isFinite(Number(id)));
  for (const pid of candidateIds) {
    const res = await client.query(
      `SELECT MAX(${SUPPLIER_COST_COLS.price}) AS price
         FROM ${SUPPLIER_COST_TABLE}
         WHERE ${SUPPLIER_COST_COLS.productId} = $1`,
      [pid]
    );
    if (res.rows.length && res.rows[0].price !== undefined && res.rows[0].price !== null) {
      return res.rows[0].price;
    }
  }
  return null;
};

module.exports = {
  stripAccents,
  safeStringify,
  extractOrderCodeFromText,
  extractSenderFromContent,
  splitTransactionContent,
  parsePaidDate,
  normalizeAmount,
  safeIdent,
  normalizeProductDuration,
  parseFlexibleDate,
  formatDateDMY,
  formatDateDB,
  addDays,
  addMonthsClamped,
  daysUntil,
  normalizeMoney,
  normalizeImportValue,
  roundToThousands,
  formatCurrency,
  calcGiaBan,
  extractOrderCodes,
  deriveOrderCode,
  fetchProductPricing,
  findSupplyId,
  fetchSupplyPrice,
  fetchMaxSupplyPrice,
};
