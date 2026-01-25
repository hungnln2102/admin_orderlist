const { db } = require("../../../db");
const {
  TABLES,
  STATUS,
  QUOTED_COLS,
  orderCols,
  variantCols,
  supplyPriceCols,
} = require("../constants");
const {
  createDateNormalization,
  createSourceKey,
  createNumericExtraction,
  quoteIdent,
} = require("../../../utils/sql");
const { normalizeSupplyStatus, formatDateOutput } = require("../../../utils/normalizers");
const { resolveSupplyStatusColumn } = require("../helpers");
const logger = require("../../../utils/logger");

// Explicit supplier tables (prefer configured supplier schema, fallback to product/partner for legacy DBs)
const { SCHEMA_SUPPLIER, SCHEMA_SUPPLIER_COST } = require("../../../config/dbSchema");
const SUPPLIER_COST_TABLE = `${SCHEMA_SUPPLIER_COST}.supplier_cost`;
const SUPPLIER_PRODUCT_TABLE = `${SCHEMA_SUPPLIER}.supplier`;
const SUPPLIER_PARTNER_TABLE = "partner.supplier";
let supplierTableNameCache = null;
let supplierNameColumnCache = null;
const resolveSupplierTableName = async () => {
  if (supplierTableNameCache) return supplierTableNameCache;
  try {
    const exists = await db("information_schema.tables")
      .select("table_name")
      .where({ table_schema: "product", table_name: "supplier" })
      .first();
    supplierTableNameCache = exists ? SUPPLIER_PRODUCT_TABLE : SUPPLIER_PARTNER_TABLE;
  } catch (err) {
    logger.warn("[insights] Could not resolve supplier table, defaulting to partner.supplier", { error: err?.message || err });
    supplierTableNameCache = SUPPLIER_PRODUCT_TABLE;
  }
  return supplierTableNameCache;
};
const resolveSupplierNameColumn = async () => {
  if (supplierNameColumnCache) return supplierNameColumnCache;
  try {
    const tableName = await resolveSupplierTableName();
    const [schema, table] = tableName.includes(".") ? tableName.split(".") : ["product", tableName];
    const res = await db("information_schema.columns")
      .select("column_name")
      .where({ table_schema: schema, table_name: table })
      .whereIn("column_name", ["supplier_name", "source_name"])
      .orderByRaw(`CASE column_name WHEN 'supplier_name' THEN 1 WHEN 'source_name' THEN 2 ELSE 3 END`)
      .first();
    supplierNameColumnCache = res?.column_name || "supplier_name";
  } catch (err) {
    logger.warn("[insights] Could not resolve supplier name column, defaulting to supplier_name", { error: err?.message || err });
    supplierNameColumnCache = "supplier_name";
  }
  return supplierNameColumnCache;
};

const getSupplyInsights = async (_req, res) => {
  logger.debug("[GET] /api/supply-insights");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);

  try {
    const statusColumnName = await resolveSupplyStatusColumn();
    const statusColumnIdent = statusColumnName ? quoteIdent(statusColumnName) : null;
    const statusSelect = statusColumnIdent
      ? `${statusColumnIdent}::text AS raw_status`
      : "NULL AS raw_status";

    const monthlySql = `
      WITH params AS (
        SELECT ?::date AS curr_start, ?::date AS curr_end
      )
      SELECT
        source_key,
        COUNT(*) AS monthly_orders,
        COALESCE(SUM(import_value), 0) AS monthly_import_value
      FROM (
        SELECT
          ${createSourceKey(quoteIdent(orderCols.supply))} AS source_key,
          ${createNumericExtraction(quoteIdent(orderCols.cost))} AS import_value,
          ${createDateNormalization(quoteIdent(orderCols.orderDate))} AS order_date
        FROM ${TABLES.orderList}, params
        WHERE TRIM(${quoteIdent(orderCols.supply)}::text) <> ''
          AND ${createDateNormalization(quoteIdent(orderCols.orderDate))} >= params.curr_start
          AND ${createDateNormalization(quoteIdent(orderCols.orderDate))} < params.curr_end
        UNION ALL
        SELECT
          ${createSourceKey(quoteIdent(orderCols.supply))} AS source_key,
          ${createNumericExtraction(quoteIdent(orderCols.cost))} AS import_value,
          ${createDateNormalization(quoteIdent(orderCols.orderDate))} AS order_date
        FROM ${TABLES.orderExpired}, params
        WHERE TRIM(${quoteIdent(orderCols.supply)}::text) <> ''
          AND ${createDateNormalization(quoteIdent(orderCols.orderDate))} >= params.curr_start
          AND ${createDateNormalization(quoteIdent(orderCols.orderDate))} < params.curr_end
        UNION ALL
        SELECT
          ${createSourceKey(quoteIdent(orderCols.supply))} AS source_key,
          ${createNumericExtraction(quoteIdent(orderCols.cost))} AS import_value,
          ${createDateNormalization("createdate")} AS order_date
        FROM ${TABLES.orderCanceled}, params
        WHERE TRIM(${quoteIdent(orderCols.supply)}::text) <> ''
          AND ${createDateNormalization("createdate")} >= params.curr_start
          AND ${createDateNormalization("createdate")} < params.curr_end
      ) m
      WHERE order_date IS NOT NULL
      GROUP BY source_key
    `;

    const summarySql = `
      SELECT
        source_key,
        SUM(total_orders) AS total_orders,
        MAX(last_order_date) AS last_order_date
      FROM (
        SELECT
          ${createSourceKey(quoteIdent(orderCols.supply))} AS source_key,
          COUNT(*) AS total_orders,
          MAX(${createDateNormalization(quoteIdent(orderCols.orderDate))}) AS last_order_date
        FROM ${TABLES.orderList}
        WHERE TRIM(${quoteIdent(orderCols.supply)}::text) <> ''
        GROUP BY source_key
        UNION ALL
        SELECT
          ${createSourceKey(quoteIdent(orderCols.supply))} AS source_key,
          COUNT(*) AS total_orders,
          MAX(${createDateNormalization(quoteIdent(orderCols.orderDate))}) AS last_order_date
        FROM ${TABLES.orderExpired}
        WHERE TRIM(${quoteIdent(orderCols.supply)}::text) <> ''
        GROUP BY source_key
        UNION ALL
        SELECT
          ${createSourceKey(quoteIdent(orderCols.supply))} AS source_key,
          COUNT(*) AS total_orders,
          MAX(${createDateNormalization("createdate")}) AS last_order_date
      FROM ${TABLES.orderCanceled}
      WHERE TRIM(${quoteIdent(orderCols.supply)}::text) <> ''
      GROUP BY source_key
    ) agg
    WHERE source_key <> ''
      GROUP BY source_key
    `;

    const productsSql = `
      SELECT
        sp.${quoteIdent(supplyPriceCols.supplierId)} AS source_id,
        ARRAY_REMOVE(
          ARRAY_AGG(
            DISTINCT NULLIF(
              TRIM(v.${quoteIdent(variantCols.displayName)}::text),
              ''
            )
          ),
          NULL
        ) AS product_list
      FROM ${SUPPLIER_COST_TABLE} sp
      LEFT JOIN ${TABLES.variant} v
        ON sp.${quoteIdent(supplyPriceCols.productId)} = v.id
      GROUP BY sp.${quoteIdent(supplyPriceCols.supplierId)}
    `;

    // Tính tổng đã trả và còn nợ theo trạng thái để không trừ nhầm chu kỳ đã thanh toán
    const paymentSummarySql = `
      SELECT
        ps.${QUOTED_COLS.paymentSupply.sourceId} AS source_id,
        SUM(COALESCE(ps.${QUOTED_COLS.paymentSupply.paid}, 0)) AS total_paid_import,
        SUM(
          CASE
            WHEN ps.${QUOTED_COLS.paymentSupply.status} = :unpaidStatus
              THEN COALESCE(ps.${QUOTED_COLS.paymentSupply.importValue}, 0) - COALESCE(ps.${QUOTED_COLS.paymentSupply.paid}, 0)
            ELSE 0
          END
        ) AS total_unpaid_import
      FROM ${TABLES.paymentSupply} ps
      GROUP BY ps.${QUOTED_COLS.paymentSupply.sourceId}
    `;

    const supplierTableName = await resolveSupplierTableName();
    const supplierNameCol = await resolveSupplierNameColumn();
    const supplierNameIdent = quoteIdent(supplierNameCol);
  const supplySql = `
      SELECT
        s.${QUOTED_COLS.supplier.id} AS id,
        s.${supplierNameIdent} AS source_name,
        s.${QUOTED_COLS.supplier.numberBank} AS number_bank,
        s.${QUOTED_COLS.supplier.binBank} AS bin_bank,
        ${statusSelect}
      FROM ${supplierTableName} s
      ORDER BY s.${supplierNameIdent};
    `;

    const [monthlyRes, summaryRes, productsRes, paymentsRes, supplyRes] = await Promise.all([
      db.raw(monthlySql, [monthStart, nextMonthStart]),
      db.raw(summarySql),
      db.raw(productsSql),
      db.raw(paymentSummarySql, { unpaidStatus: STATUS.UNPAID }),
      db.raw(supplySql),
    ]);

    const makeSourceKey = (value) =>
      String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

    const monthlyMap = new Map();
    (monthlyRes.rows || []).forEach((row) => {
      monthlyMap.set(row.source_key, {
        monthly_orders: Number(row.monthly_orders) || 0,
        monthly_import_value: Number(row.monthly_import_value) || 0,
      });
    });

    const summaryMap = new Map();
    (summaryRes.rows || []).forEach((row) => {
      summaryMap.set(row.source_key, {
        total_orders: Number(row.total_orders) || 0,
        last_order_date: row.last_order_date || null,
      });
    });

    const productsMap = new Map();
    (productsRes.rows || []).forEach((row) => {
      productsMap.set(row.source_id, row.product_list || []);
    });

    const paymentsMap = new Map();
    (paymentsRes.rows || []).forEach((row) => {
      paymentsMap.set(row.source_id, {
        total_paid_import: Number(row.total_paid_import) || 0,
        total_unpaid_import: Number(row.total_unpaid_import) || 0,
      });
    });

    const supplies = (supplyRes.rows || []).map((row) => {
      const sourceKey = makeSourceKey(row.source_name);
      const monthly = monthlyMap.get(sourceKey) || {
        monthly_orders: 0,
        monthly_import_value: 0,
      };
      const summary = summaryMap.get(sourceKey) || {
        total_orders: 0,
        last_order_date: null,
      };
      const payments = paymentsMap.get(row.id) || {
        total_paid_import: 0,
        total_unpaid_import: 0,
      };
      const normalizedStatus = normalizeSupplyStatus(row.raw_status);
      const totalUnpaidImport = payments.total_unpaid_import;

      return {
        id: row.id,
        sourceName: row.source_name || "",
        numberBank: row.number_bank || null,
        binBank: row.bin_bank || null,
        status: normalizedStatus || "inactive",
        rawStatus: row.raw_status || null,
        isActive: normalizedStatus !== "inactive",
        products: productsMap.get(row.id) || [],
        monthlyOrders: monthly.monthly_orders,
        monthlyImportValue: monthly.monthly_import_value,
        lastOrderDate: formatDateOutput(summary.last_order_date),
        totalOrders: summary.total_orders,
        totalPaidImport: payments.total_paid_import,
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
    logger.error("Query failed (GET /api/supply-insights)", { error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể tải thông tin chi tiết về nguồn cung.",
    });
  }
};

module.exports = { getSupplyInsights };

