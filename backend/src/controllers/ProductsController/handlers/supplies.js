const { db } = require("../../../db");
const { QUOTED_COLS, supplyPriceCols, TABLES } = require("../constants");
const { findProductIdByName, ensureSupplyRecord, upsertSupplyPrice } = require("../finders");
const { mapSupplyPriceRow } = require("../mappers");
const { quoteIdent } = require("../../../utils/sql");
const {
  resolveSupplierTableName,
  resolveSupplierNameColumn,
} = require("../../SuppliesController/helpers");
const { updateOrderCostsOnSupplyPriceChange } = require("../../../services/updateOrderCostsOnSupplyPriceChange");
const logger = require("../../../utils/logger");

const getSuppliesByProductName = async (req, res) => {
  const { productName } = req.params;
  try {
    const supplierTable = await resolveSupplierTableName();
    const supplierNameCol = await resolveSupplierNameColumn();
    const supplierNameIdent = quoteIdent(supplierNameCol);
    const ids = await findProductIdByName(productName);
    const candidateIds = [ids.variantId, ids.productId].filter((id) => Number.isFinite(Number(id)));
    if (!candidateIds.length) {
      return res.json([]);
    }
    const placeholders = candidateIds.map(() => "?").join(", ");
    const query = `
      SELECT
        sp.${quoteIdent(supplyPriceCols.supplierId)} AS source_id,
        COALESCE(s.${supplierNameIdent}, '') AS source_name
      FROM ${TABLES.supplyPrice} sp
      LEFT JOIN ${supplierTable} s
        ON s.${quoteIdent("id")} = sp.${quoteIdent(supplyPriceCols.supplierId)}
      WHERE sp.${quoteIdent(supplyPriceCols.productId)} IN (${placeholders})
      ORDER BY COALESCE(s.${supplierNameIdent}, sp.${quoteIdent(
        supplyPriceCols.supplierId
      )}::text);
    `;
    const result = await db.raw(query, candidateIds);
    const rows =
      result.rows?.map((row) => ({
        id: Number(row.source_id) || null,
        source_name: row.source_name || "",
      })) || [];
    res.json(rows);
  } catch (error) {
    logger.error("Query failed (GET /api/products/supplies-by-name/:productName)", { productName, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải nhà cung cấp cho sản phẩm." });
  }
};

const getSupplyPricesByProductName = async (req, res) => {
  const { productName } = req.params;
  try {
    const supplierTable = await resolveSupplierTableName();
    const supplierNameCol = await resolveSupplierNameColumn();
    const supplierNameIdent = quoteIdent(supplierNameCol);
    const ids = await findProductIdByName(productName);
    const candidateIds = [ids.variantId, ids.productId].filter((id) => Number.isFinite(Number(id)));
    if (!candidateIds.length) {
      return res.json([]);
    }
    const placeholders = candidateIds.map(() => "?").join(", ");
    const query = `
      SELECT
        sp.${quoteIdent(supplyPriceCols.supplierId)} AS source_id,
        sp.${quoteIdent(supplyPriceCols.price)} AS price,
        COALESCE(s.${supplierNameIdent}, '') AS source_name,
        NULL::text AS last_order_date
      FROM ${TABLES.supplyPrice} sp
      LEFT JOIN ${supplierTable} s
        ON s.${quoteIdent("id")} = sp.${quoteIdent(supplyPriceCols.supplierId)}
      WHERE sp.${quoteIdent(supplyPriceCols.productId)} IN (${placeholders})
      ORDER BY COALESCE(s.${supplierNameIdent}, sp.${quoteIdent(
        supplyPriceCols.supplierId
      )}::text);
    `;
    const result = await db.raw(query, candidateIds);
    res.json((result.rows || []).map(mapSupplyPriceRow));
  } catch (error) {
    logger.error("Query failed (GET /api/products/all-prices-by-name/:productName)", { productName, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải giá nhà cung cấp cho sản phẩm." });
  }
};

const updateSupplyPriceForProduct = async (req, res) => {
  const { productId, sourceId } = req.params;
  const { price } = req.body || {};
  try {
    const result = await upsertSupplyPrice({ productId }, sourceId, price);
    
    // Auto-update order costs for PROCESSING and UNPAID orders
    try {
      const updateResult = await updateOrderCostsOnSupplyPriceChange(
        Number(productId),
        Number(sourceId),
        price
      );
      
      // Include update info in response (optional)
      res.json({
        productId: result.productId,
        sourceId: result.supplierId,
        supplierId: result.supplierId,
        price: result.price,
        ordersUpdated: updateResult.updatedCount,
      });
    } catch (updateError) {
      // Log error but don't fail the price update
      logger.error("Failed to auto-update order costs", { productId, sourceId, error: updateError?.message, stack: updateError?.stack });
      
      // Still return success for the price update
      res.json({
        productId: result.productId,
        sourceId: result.supplierId,
        supplierId: result.supplierId,
        price: result.price,
        ordersUpdated: 0,
        updateError: "Failed to update orders",
      });
    }
  } catch (error) {
    logger.error("Update failed (PATCH /api/products/:productId/suppliers/:sourceId/price)", { productId, sourceId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể cập nhật giá nhà cung cấp." });
  }
};

const createSupplyPriceForProduct = async (req, res) => {
  const { productId } = req.params;
  const { sourceId, sourceName, price, numberBank, binBank } = req.body || {};
  try {
    const parsedProductId = Number(productId);
    if (!Number.isFinite(parsedProductId) || parsedProductId <= 0) {
      return res.status(400).json({ error: "ID sản phẩm không hợp lệ." });
    }
    const resolvedSourceId = Number.isFinite(Number(sourceId))
      ? Number(sourceId)
      : await ensureSupplyRecord(sourceName, numberBank, binBank);
    if (!resolvedSourceId) {
      return res.status(400).json({ error: "Nhà cung cấp bị thiếu hoặc không hợp lệ." });
    }
    const result = await upsertSupplyPrice({ productId: parsedProductId }, resolvedSourceId, price);
    res.status(201).json({
      productId: result.productId,
      sourceId: result.supplierId,
      supplierId: result.supplierId,
      price: result.price,
    });
  } catch (error) {
    logger.error("Insert failed (POST /api/product-prices/:productId/suppliers)", { productId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể thêm giá nhà cung cấp." });
  }
};

const deleteSupplyPriceForProduct = async (req, res) => {
  const { productId, sourceId } = req.params;
  const parsedProductId = Number(productId);
  const parsedSourceId = Number(sourceId);
  if (!Number.isFinite(parsedProductId) || !Number.isFinite(parsedSourceId)) {
    return res
      .status(400)
      .json({ error: "ID sản phẩm hoặc ID nhà cung cấp không hợp lệ." });
  }
  try {
    await db.raw(
      `
      DELETE FROM ${TABLES.supplyPrice}
      WHERE ${quoteIdent(supplyPriceCols.productId)} = ?
        AND ${quoteIdent(supplyPriceCols.supplierId)} = ?;
    `,
      [parsedProductId, parsedSourceId]
    );
    res.json({ success: true });
  } catch (error) {
    logger.error("Delete failed (DELETE /api/products/:productId/suppliers/:sourceId)", { productId, sourceId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể xóa giá nhà cung cấp." });
  }
};

module.exports = {
  getSuppliesByProductName,
  getSupplyPricesByProductName,
  updateSupplyPriceForProduct,
  createSupplyPriceForProduct,
  deleteSupplyPriceForProduct,
};
