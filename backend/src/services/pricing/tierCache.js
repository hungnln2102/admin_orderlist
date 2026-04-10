/**
 * In-memory cache cho pricing_tier.
 * Thay thế ORDER_PREFIXES hardcode — tất cả modules import từ đây.
 *
 * getTiers()       → [{ id, key, prefix, label, pricing_rule, base_tier_key, sort_order, is_active }]
 * getPrefixMap()   → { ctv: "MAVC", customer: "MAVL", ... }   (backward compat)
 * getTierByPrefix("MAVC") → tier object
 * invalidate()     → xóa cache, lần gọi tiếp sẽ reload từ DB
 */
const { db } = require("../../db");
const { SCHEMA_PRODUCT, PRICING_TIER_SCHEMA } = require("../../config/dbSchema");
const logger = require("../../utils/logger");

const TIER_TABLE = `${SCHEMA_PRODUCT}.${PRICING_TIER_SCHEMA.PRICING_TIER.TABLE}`;

const FALLBACK_TIERS = [
  { id: 1, key: "ctv",      prefix: "MAVC", label: "Cộng Tác Viên", pricing_rule: "markup",     base_tier_key: null,       sort_order: 1, is_active: true },
  { id: 2, key: "customer", prefix: "MAVL", label: "Khách Lẻ",      pricing_rule: "markup",     base_tier_key: "ctv",      sort_order: 2, is_active: true },
  { id: 3, key: "promo",    prefix: "MAVK", label: "Khuyến Mãi",    pricing_rule: "discount",   base_tier_key: "customer", sort_order: 3, is_active: true },
  { id: 4, key: "student",  prefix: "MAVS", label: "Sinh Viên",     pricing_rule: "markup",     base_tier_key: "ctv",      sort_order: 4, is_active: true },
  { id: 5, key: "gift",     prefix: "MAVT", label: "Quà Tặng",      pricing_rule: "fixed_zero", base_tier_key: null,       sort_order: 5, is_active: true },
  { id: 6, key: "import",   prefix: "MAVN", label: "Nhập Hàng",     pricing_rule: "cost",       base_tier_key: null,       sort_order: 6, is_active: true },
];

let _cache = null;
let _cacheTs = 0;
const TTL = 10 * 60_000;

async function _load() {
  try {
    const rows = await db(TIER_TABLE).select("*").orderBy("sort_order", "asc");
    if (rows && rows.length > 0) return rows;
  } catch (err) {
    logger.warn("[TierCache] DB load failed, using fallback", { error: err.message });
  }
  return FALLBACK_TIERS;
}

async function getTiers() {
  if (_cache && Date.now() - _cacheTs < TTL) return _cache;
  _cache = await _load();
  _cacheTs = Date.now();
  return _cache;
}

async function getPrefixMap() {
  const tiers = await getTiers();
  const map = {};
  for (const t of tiers) {
    if (t.is_active) map[t.key] = t.prefix;
  }
  return map;
}

async function getTierByPrefix(prefix) {
  const tiers = await getTiers();
  const upper = String(prefix || "").toUpperCase();
  return tiers.find((t) => t.prefix.toUpperCase() === upper) || null;
}

async function getTierByKey(key) {
  const tiers = await getTiers();
  return tiers.find((t) => t.key === key) || null;
}

async function getActivePrefixes() {
  const tiers = await getTiers();
  return tiers.filter((t) => t.is_active).map((t) => t.prefix);
}

function invalidate() {
  _cache = null;
  _cacheTs = 0;
}

module.exports = {
  getTiers,
  getPrefixMap,
  getTierByPrefix,
  getTierByKey,
  getActivePrefixes,
  invalidate,
  FALLBACK_TIERS,
};
