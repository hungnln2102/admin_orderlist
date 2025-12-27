const { db } = require("../../../db");
const { QUOTED_COLS, supplyPriceCols, TABLES } = require("../constants");
const { findProductIdByName, ensureSupplyRecord, upsertSupplyPrice } = require("../finders");
const { mapSupplyPriceRow } = require("../mappers");
const { quoteIdent } = require("../../../utils/sql");

const getSuppliesByProductName = async (req, res) => {
  const { productName } = req.params;
  try {
    const productId = await findProductIdByName(productName);
    if (!productId) {
      return res.json([]);
    }
    const query = `
      SELECT
        sp.${quoteIdent(supplyPriceCols.sourceId)} AS source_id,
        COALESCE(s.${QUOTED_COLS.supply.sourceName}, '') AS source_name
      FROM ${TABLES.supplyPrice} sp
      LEFT JOIN ${TABLES.supply} s
        ON s.${QUOTED_COLS.supply.id} = sp.${quoteIdent(supplyPriceCols.sourceId)}
      WHERE sp.${quoteIdent(supplyPriceCols.productId)} = ?
      ORDER BY COALESCE(s.${QUOTED_COLS.supply.sourceName}, sp.${quoteIdent(
        supplyPriceCols.sourceId
      )}::text);
    `;
    const result = await db.raw(query, [productId]);
    const rows =
      result.rows?.map((row) => ({
        id: Number(row.source_id) || null,
        source_name: row.source_name || "",
      })) || [];
    res.json(rows);
  } catch (error) {
    console.error(
      `Query failed (GET /api/products/supplies-by-name/${productName}):`,
      error
    );
    res.status(500).json({ error: "Không thể tải nhà cung cấp cho sản phẩm." });
  }
};

const getSupplyPricesByProductName = async (req, res) => {
  const { productName } = req.params;
  try {
    const productId = await findProductIdByName(productName);
    if (!productId) {
      return res.json([]);
    }
    const query = `
      SELECT
        sp.${quoteIdent(supplyPriceCols.sourceId)} AS source_id,
        sp.${quoteIdent(supplyPriceCols.price)} AS price,
        COALESCE(s.${QUOTED_COLS.supply.sourceName}, '') AS source_name,
        NULL::text AS last_order_date
      FROM ${TABLES.supplyPrice} sp
      LEFT JOIN ${TABLES.supply} s
        ON s.${QUOTED_COLS.supply.id} = sp.${quoteIdent(supplyPriceCols.sourceId)}
      WHERE sp.${quoteIdent(supplyPriceCols.productId)} = ?
      ORDER BY COALESCE(s.${QUOTED_COLS.supply.sourceName}, sp.${quoteIdent(
        supplyPriceCols.sourceId
      )}::text);
    `;
    const result = await db.raw(query, [productId]);
    res.json((result.rows || []).map(mapSupplyPriceRow));
  } catch (error) {
    console.error(
      `Query failed (GET /api/products/all-prices-by-name/${productName}):`,
      error
    );
    res.status(500).json({ error: "Không thể tải giá nhà cung cấp cho sản phẩm." });
  }
};

const updateSupplyPriceForProduct = async (req, res) => {
  const { productId, sourceId } = req.params;
  const { price } = req.body || {};
  try {
    const result = await upsertSupplyPrice(productId, sourceId, price);
    res.json({
      productId: result.productId,
      sourceId: result.sourceId,
      price: result.price,
    });
  } catch (error) {
    console.error(
      `Update failed (PATCH /api/products/${productId}/suppliers/${sourceId}/price):`,
      error
    );
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
    const result = await upsertSupplyPrice(parsedProductId, resolvedSourceId, price);
    res.status(201).json({
      productId: result.productId,
      sourceId: result.sourceId,
      price: result.price,
    });
  } catch (error) {
    console.error(
      `Insert failed (POST /api/product-prices/${productId}/suppliers):`,
      error
    );
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
        AND ${quoteIdent(supplyPriceCols.sourceId)} = ?;
    `,
      [parsedProductId, parsedSourceId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(
      `Delete failed (DELETE /api/products/${productId}/suppliers/${sourceId}):`,
      error
    );
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
