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

const fetchVariantDisplayNames = async (client, variantIds) => {
  const map = new Map();
  const ids = [...new Set(variantIds)].filter((id) => id != null && Number.isFinite(Number(id)));
  if (ids.length === 0) return map;

  const sql = `
    SELECT ${quote(ID_COL)} AS id,
           COALESCE(${quote(DISPLAY_NAME_COL)}, ${quote(VARIANT_NAME_COL)}) AS name
    FROM ${VARIANT_TABLE}
    WHERE ${quote(ID_COL)} = ANY($1::int[])
  `;
  const res = await client.query(sql, [ids]);
  for (const row of res.rows || []) {
    if (row.id != null && row.name != null) {
      map.set(Number(row.id), String(row.name).trim());
    }
  }
  return map;
};

module.exports = { fetchVariantDisplayNames };
