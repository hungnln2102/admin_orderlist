const { db } = require("../../../db");
const { QUOTED_COLS, productCols, supplyPriceCols, TABLES } = require("../constants");
const { quoteIdent } = require("../../../utils/sql");
const { mapProductPriceRow } = require("../mappers");

const listProducts = async (_req, res) => {
  try {
    const query = `
      SELECT
        ${QUOTED_COLS.productPrice.id} AS id,
        ${QUOTED_COLS.productPrice.product} AS id_product,
        ${QUOTED_COLS.productPrice.product} AS san_pham,
        ${QUOTED_COLS.productPrice.packageProduct} AS package_product,
        ${QUOTED_COLS.productPrice.package} AS package
      FROM ${TABLES.productPrice}
      ORDER BY ${QUOTED_COLS.productPrice.product};
    `;
    const result = await db.raw(query);
    const rows = (result.rows || []).map(mapProductPriceRow);
    res.json(rows);
  } catch (error) {
    console.error("Query failed (GET /api/products):", error);
    res.status(500).json({ error: "Không thể tải sản phẩm." });
  }
};

const listProductPrices = async (_req, res) => {
  try {
    const query = `
      SELECT
        pp.${quoteIdent(productCols.id)} AS id,
        pp.${quoteIdent(productCols.product)} AS id_product,
        pp.${quoteIdent(productCols.product)} AS san_pham,
        pp.${quoteIdent(productCols.packageProduct)} AS package_product,
        pp.${quoteIdent(productCols.package)} AS package,
        pp.${quoteIdent(productCols.pctCtv)} AS pct_ctv,
        pp.${quoteIdent(productCols.pctKhach)} AS pct_khach,
        pp.${quoteIdent(productCols.pctPromo)} AS pct_promo,
        pp.${quoteIdent(productCols.isActive)} AS is_active,
        pp.${quoteIdent(productCols.updateDate)} AS update,
        MAX(sp.${quoteIdent(supplyPriceCols.price)}) AS max_supply_price
      FROM ${TABLES.productPrice} pp
      LEFT JOIN ${TABLES.supplyPrice} sp
        ON sp.${quoteIdent(supplyPriceCols.productId)} = pp.${quoteIdent(
      productCols.id
    )}
      GROUP BY
        pp.${quoteIdent(productCols.id)},
        pp.${quoteIdent(productCols.product)},
        pp.${quoteIdent(productCols.packageProduct)},
        pp.${quoteIdent(productCols.package)},
        pp.${quoteIdent(productCols.pctCtv)},
        pp.${quoteIdent(productCols.pctKhach)},
        pp.${quoteIdent(productCols.pctPromo)},
        pp.${quoteIdent(productCols.isActive)},
        pp.${quoteIdent(productCols.updateDate)}
      ORDER BY pp.${quoteIdent(productCols.id)} ASC;
    `;
    const result = await db.raw(query);
    const rows = (result.rows || []).map(mapProductPriceRow);
    res.json(rows);
  } catch (error) {
    console.error("Query failed (GET /api/product-prices):", error);
    res.status(500).json({ error: "Không thể tải giá sản phẩm." });
  }
};

const getProductPriceById = async (req, res) => {
  const { productId } = req.params;
  const parsedId = Number(productId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return res.status(400).json({ error: "ID sản phẩm không hợp lệ." });
  }
  try {
    const query = `
      SELECT *
      FROM ${TABLES.productPrice}
      WHERE ${quoteIdent(productCols.id)} = ?
      LIMIT 1;
    `;
    const result = await db.raw(query, [parsedId]);
    if (!result.rows || !result.rows.length) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    }
    res.json(mapProductPriceRow(result.rows[0]));
  } catch (error) {
    console.error(`Query failed (GET /api/product-prices/${productId}):`, error);
    res.status(500).json({ error: "Không thể tải giá sản phẩm." });
  }
};

module.exports = {
  listProducts,
  listProductPrices,
  getProductPriceById,
};
