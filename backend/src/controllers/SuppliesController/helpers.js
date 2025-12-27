const { db } = require("../../db");
const { QUOTED_COLS, SCHEMA, SUPPLY_STATUS_CANDIDATES } = require("./constants");
const { normalizeSupplyStatus } = require("../../utils/normalizers");

const parseMoney = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const cleaned = String(value).replace(/[^\d-]/g, "");
  const normalized = cleaned.startsWith("-")
    ? "-" + cleaned.slice(1).replace(/-/g, "")
    : cleaned.replace(/-/g, "");
  if (!normalized || normalized === "-") return fallback;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
};

const parseSupplyId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

let supplyStatusColumnNameCache = null;
let supplyStatusColumnResolved = false;

const resolveSupplyStatusColumn = async () => {
  if (supplyStatusColumnResolved) {
    return supplyStatusColumnNameCache;
  }
  try {
    const schemaName = process.env.DB_SCHEMA || SCHEMA || "mavryk";
    const result = await db("information_schema.columns")
      .select("column_name")
      .where({
        table_schema: schemaName,
        table_name: "supply",
      })
      .whereIn("column_name", SUPPLY_STATUS_CANDIDATES)
      .orderByRaw(`
        CASE column_name
          WHEN 'status' THEN 1
          WHEN 'trang_thai' THEN 2
          WHEN 'is_active' THEN 3
          ELSE 4 END
      `)
      .limit(1);
    supplyStatusColumnNameCache =
      result?.[0]?.column_name ? result[0].column_name : null;
  } catch (error) {
    console.warn("Không tìm thấy trường trạng thái nhà cung cấp:", error.message || error);
    supplyStatusColumnNameCache = null;
  } finally {
    supplyStatusColumnResolved = true;
  }
  return supplyStatusColumnNameCache;
};

module.exports = {
  parseMoney,
  parseSupplyId,
  resolveSupplyStatusColumn,
  normalizeSupplyStatus,
};
