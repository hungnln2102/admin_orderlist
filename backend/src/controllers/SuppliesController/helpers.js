const { db } = require("../../db");
const { QUOTED_COLS, SUPPLY_STATUS_CANDIDATES } = require("./constants");
const { SCHEMA_PRODUCT, SCHEMA_SUPPLIER, SCHEMA_PARTNER } = require("../../config/dbSchema");
const { normalizeSupplyStatus } = require("../../utils/normalizers");
const logger = require("../../utils/logger");

const SUPPLIER_TABLE_PRIMARY = `${SCHEMA_SUPPLIER}.supplier`;
const SUPPLIER_TABLE_FALLBACK = `${SCHEMA_PRODUCT}.supplier`;
let supplierTableNameCache = null;
let supplierNameColumnCache = null;
let supplyStatusColumnNameCache = null;
let supplyStatusColumnResolved = false;

const resolveSupplierTableName = async () => {
  if (supplierTableNameCache) return supplierTableNameCache;
  try {
    const existsPrimary = await db("information_schema.tables")
      .select("table_name")
      .where({ table_schema: SCHEMA_PARTNER, table_name: "supplier" })
      .first();
    if (existsPrimary) {
      supplierTableNameCache = SUPPLIER_TABLE_PRIMARY;
      return supplierTableNameCache;
    }
    const existsFallback = await db("information_schema.tables")
      .select("table_name")
      .where({ table_schema: SCHEMA_PRODUCT, table_name: "supplier" })
      .first();
    supplierTableNameCache = existsFallback ? SUPPLIER_TABLE_FALLBACK : SUPPLIER_TABLE_PRIMARY;
  } catch (error) {
    logger.warn("[supplies] fallback supplier table detection failed", { error: error?.message || error });
    supplierTableNameCache = SUPPLIER_TABLE_PRIMARY;
  }
  return supplierTableNameCache;
};

const resolveSupplierNameColumn = async () => {
  if (supplierNameColumnCache) return supplierNameColumnCache;
  try {
    const tableName = await resolveSupplierTableName();
    const [schema, table] = tableName.includes(".")
      ? tableName.split(".")
      : [SCHEMA_PARTNER, tableName];
    const res = await db("information_schema.columns")
      .select("column_name")
      .where({ table_schema: schema, table_name: table })
      .whereIn("column_name", ["supplier_name", "source_name"])
      .orderByRaw(`CASE column_name WHEN 'supplier_name' THEN 1 WHEN 'source_name' THEN 2 ELSE 3 END`)
      .first();
    supplierNameColumnCache = res?.column_name || "supplier_name";
  } catch (error) {
    logger.warn("[supplies] fallback supplier name column detection failed", { error: error?.message || error });
    supplierNameColumnCache = "supplier_name";
  }
  return supplierNameColumnCache;
};

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

const resolveSupplyStatusColumn = async () => {
  if (supplyStatusColumnResolved) {
    return supplyStatusColumnNameCache;
  }
  try {
    const tableName = await resolveSupplierTableName();
    const [schema, table] = tableName.includes(".")
      ? tableName.split(".")
      : [SCHEMA_PARTNER, tableName];
    const result = await db("information_schema.columns")
      .select("column_name")
      .where({
        table_schema: schema,
        table_name: table,
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
    logger.warn("Không tìm thấy trường trạng thái nhà cung cấp", { error: error?.message || error });
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
  resolveSupplierTableName,
  resolveSupplierNameColumn,
};


