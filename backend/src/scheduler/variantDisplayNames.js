/**
 * Lấy display_name của variant theo danh sách id (để hiển thị trong thông báo Telegram).
 * @param {object} client - pg client (từ pool.connect())
 * @param {number[]} variantIds - Danh sách variant id (id_product từ order)
 * @returns {Promise<Map<number, string>>} Map variantId -> display_name (hoặc variant_name nếu không có display_name)
 */
const { SCHEMA_PRODUCT, PRODUCT_SCHEMA, tableName } = require("../config/dbSchema");

const VARIANT_TABLE = tableName(PRODUCT_SCHEMA.VARIANT.TABLE, SCHEMA_PRODUCT);
const ID_COL = PRODUCT_SCHEMA.VARIANT.COLS.ID;
const DISPLAY_NAME_COL = PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME || "display_name";
const VARIANT_NAME_COL = PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME || "variant_name";

const quote = (v) => `"${String(v).replace(/"/g, '""')}"`;

const formatDuration = (raw) => {
  if (!raw) return "";
  const match = String(raw).match(/^(\d+)([mMyYdD])$/i);
  if (!match) return raw;
  const num = match[1];
  const unit = match[2].toLowerCase();
  if (unit === "m") return `${num} tháng`;
  if (unit === "y") return `${Number(num) * 12} tháng`;
  if (unit === "d") return `${num} ngày`;
  return raw;
};

const extractDurationSuffix = (displayName) => {
  if (!displayName) return "";
  const match = String(displayName).match(/--([\d]+[mMyYdD])/i);
  return match ? formatDuration(match[1]) : "";
};

const fetchVariantDisplayNames = async (client, variantIds) => {
  const map = new Map();
  const ids = [...new Set(variantIds)].filter((id) => id != null && Number.isFinite(Number(id)));
  if (ids.length === 0) return map;

  const sql = `
    SELECT ${quote(ID_COL)} AS id,
           ${quote(VARIANT_NAME_COL)} AS variant_name,
           ${quote(DISPLAY_NAME_COL)} AS display_name
    FROM ${VARIANT_TABLE}
    WHERE ${quote(ID_COL)} = ANY($1::int[])
  `;
  const res = await client.query(sql, [ids]);
  for (const row of res.rows || []) {
    if (row.id == null) continue;
    const variantName = row.variant_name ? String(row.variant_name).trim() : "";
    const displayName = row.display_name ? String(row.display_name).trim() : "";
    const duration = extractDurationSuffix(displayName);
    const label = variantName
      ? `${variantName}${duration ? ` (${duration})` : ""}`
      : displayName || String(row.id);
    map.set(Number(row.id), label);
  }
  return map;
};

module.exports = { fetchVariantDisplayNames };
