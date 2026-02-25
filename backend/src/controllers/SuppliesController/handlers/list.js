const { db } = require("../../../db");
const { QUOTED_COLS, TABLES, variantCols, supplyPriceCols } = require("../constants");
const { quoteIdent, createNumericExtraction } = require("../../../utils/sql");
const { parseSupplyId, resolveSupplierTableName, resolveSupplierNameColumn } = require("../helpers");
const logger = require("../../../utils/logger");

const listSupplies = async (_req, res) => {
  try {
    const supplierTable = await resolveSupplierTableName();
    const supplierNameCol = await resolveSupplierNameColumn();
    
    // Use Knex query builder for better maintainability
    const rows = await db(supplierTable)
      .select({
        id: "id",
        source_name: supplierNameCol,
        number_bank: "number_bank",
        bin_bank: "bin_bank",
      })
      .orderBy(supplierNameCol, "asc");
    
    res.json(rows || []);
  } catch (error) {
    logger.error("Query failed (GET /api/supplies)", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải danh sách nhà cung cấp." });
  }
};

const getProductsBySupply = async (req, res) => {
  const { supplyId } = req.params;
  logger.debug(`[GET] /api/supplies/${supplyId}/products`, { supplyId });

  try {
    // Use Knex query builder with table aliases for better maintainability
    // Using raw SQL for column references to ensure correct schema resolution
    const rows = await db(TABLES.supplyPrice)
      .distinct()
      .select(
        db.raw(`${TABLES.variant}.${variantCols.id} as id`),
        db.raw(`${TABLES.variant}.${variantCols.displayName} as san_pham`)
      )
      .join(TABLES.variant, `${TABLES.supplyPrice}.${supplyPriceCols.variantId}`, "=", db.raw(`${TABLES.variant}.${variantCols.id}`))
      .where(`${TABLES.supplyPrice}.${supplyPriceCols.supplierId}`, supplyId)
      .orderBy(db.raw(`${TABLES.variant}.${variantCols.displayName}`), "asc");
    
    res.json(rows || []);
  } catch (error) {
    logger.error("Query failed (GET /api/supplies/:id/products)", { supplyId, error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể tải sản phẩm cho nhà cung cấp này.",
    });
  }
};

const listPaymentsBySupply = async (req, res) => {
  const { supplyId } = req.params;
  logger.debug(`[GET] /api/supplies/${supplyId}/payments`, { supplyId, query: req.query });

  const parsedSupplyId = parseSupplyId(supplyId);
  if (!parsedSupplyId) {
    return res.status(400).json({ error: "ID nhà cung cấp không hợp lệ." });
  }

  const limitParam = Number.parseInt(req.query.limit, 10);
  const offsetParam = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 50)
    : 5;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;
  const limitPlusOne = limit + 1;
  const supplierTable = await resolveSupplierTableName();
  const supplierNameCol = await resolveSupplierNameColumn();
  const supplierNameIdent = quoteIdent(supplierNameCol);
  const q = `
    SELECT
      ps.${QUOTED_COLS.paymentSupply.id} AS id,
      ps.${QUOTED_COLS.paymentSupply.sourceId} AS source_id,
      COALESCE(s.${supplierNameIdent}, '') AS source_name,
      ${createNumericExtraction(`ps.${QUOTED_COLS.paymentSupply.importValue}`)} AS import_value,
      ${createNumericExtraction(`ps.${QUOTED_COLS.paymentSupply.paid}`)} AS paid_value,
      COALESCE(ps.${QUOTED_COLS.paymentSupply.round}, '') AS round_label,
      COALESCE(ps.${QUOTED_COLS.paymentSupply.status}, '') AS status_label
    FROM ${TABLES.paymentSupply} ps
    LEFT JOIN ${supplierTable} s ON s.${quoteIdent("id")} = ps.${QUOTED_COLS.paymentSupply.sourceId}
    WHERE ps.${QUOTED_COLS.paymentSupply.sourceId} = ?
    ORDER BY ps.${QUOTED_COLS.paymentSupply.id} DESC
    OFFSET ?
    LIMIT ?;
  `;

  try {
    const result = await db.raw(q, [parsedSupplyId, offset, limitPlusOne]);
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
    logger.error("Query failed (GET /api/supplies/:id/payments)", { supplyId, error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể tải lịch sử thanh toán cho nhà cung cấp này.",
    });
  }
};

module.exports = {
  listSupplies,
  getProductsBySupply,
  listPaymentsBySupply,
};
