const { db } = require("../../../db");
const {
  QUOTED_COLS,
  variantCols,
  categoryCols,
  productCategoryCols,
  priceConfigCols,
  productSchemaCols,
  supplyPriceCols,
  TABLES,
} = require("../constants");
const { quoteIdent } = require("../../../utils/sql");
const { mapProductPriceRow } = require("../mappers");

const listProducts = async (_req, res) => {
  try {
    const query = `
      SELECT
        v.id AS id,
        v.${quoteIdent(variantCols.displayName)} AS id_product,
        v.${quoteIdent(variantCols.displayName)} AS san_pham,
        v.${quoteIdent(variantCols.variantName)} AS package_product,
        p.${quoteIdent(productSchemaCols.packageName)} AS package,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', c.${quoteIdent(categoryCols.id)},
              'name', c.${quoteIdent(categoryCols.name)},
              'color', pc.${quoteIdent(productCategoryCols.color)}
            )
          ) FILTER (WHERE c.${quoteIdent(categoryCols.id)} IS NOT NULL),
          '[]'::json
        ) AS categories
      FROM ${TABLES.variant} v
      LEFT JOIN ${TABLES.product} p
        ON p.${quoteIdent(productSchemaCols.id)} = v.${quoteIdent(variantCols.productId)}
      LEFT JOIN ${TABLES.productCategory} pc
        ON pc.${quoteIdent(productCategoryCols.productId)} = p.${quoteIdent(productSchemaCols.id)}
      LEFT JOIN ${TABLES.category} c
        ON c.${quoteIdent(categoryCols.id)} = pc.${quoteIdent(productCategoryCols.categoryId)}
      GROUP BY
        v.id,
        v.${quoteIdent(variantCols.displayName)},
        v.${quoteIdent(variantCols.variantName)},
        p.${quoteIdent(productSchemaCols.packageName)}
      ORDER BY v.${quoteIdent(variantCols.displayName)};
    `;
    const result = await db.raw(query);
    const rows = (result.rows || []).map(mapProductPriceRow);
    res.json(rows);
  } catch (error) {
    console.error("Query failed (GET /api/products):", error);
    res.status(500).json({ error: "Không thể tải sản phẩm. Vui lòng thử lại." });
  }
};

const listProductPrices = async (_req, res) => {
  try {
    const query = `
      SELECT
        v.id AS id,
        v.${quoteIdent(variantCols.displayName)} AS id_product,
        v.${quoteIdent(variantCols.displayName)} AS san_pham,
        v.${quoteIdent(variantCols.variantName)} AS package_product,
        p.${quoteIdent(productSchemaCols.packageName)} AS package,
        pc.${quoteIdent(priceConfigCols.pctCtv)} AS pct_ctv,
        pc.${quoteIdent(priceConfigCols.pctKhach)} AS pct_khach,
        pc.${quoteIdent(priceConfigCols.pctPromo)} AS pct_promo,
        v.${quoteIdent(variantCols.isActive)} AS is_active,
        pc.${quoteIdent(priceConfigCols.updatedAt)} AS update,
        spagg.max_supply_price AS max_supply_price
      FROM ${TABLES.variant} v
      LEFT JOIN ${TABLES.product} p
        ON p.${quoteIdent(productSchemaCols.id)} = v.${quoteIdent(variantCols.productId)}
      LEFT JOIN LATERAL (
        SELECT
          pc.${quoteIdent(priceConfigCols.pctCtv)},
          pc.${quoteIdent(priceConfigCols.pctKhach)},
          pc.${quoteIdent(priceConfigCols.pctPromo)},
          pc.${quoteIdent(priceConfigCols.updatedAt)}
        FROM ${TABLES.priceConfig} pc
        WHERE pc.${quoteIdent(priceConfigCols.variantId)} = v.id
        ORDER BY pc.${quoteIdent(priceConfigCols.updatedAt)} DESC NULLS LAST
        LIMIT 1
      ) pc ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(sp.${quoteIdent(supplyPriceCols.price)}) AS max_supply_price
        FROM ${TABLES.supplyPrice} sp
        WHERE sp.${quoteIdent(supplyPriceCols.productId)} = v.id
      ) spagg ON TRUE
      ORDER BY v.${quoteIdent(variantCols.displayName)} ASC;
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
      SELECT
        v.id AS id,
        v.${quoteIdent(variantCols.displayName)} AS id_product,
        v.${quoteIdent(variantCols.displayName)} AS san_pham,
        v.${quoteIdent(variantCols.variantName)} AS package_product,
        p.${quoteIdent(productSchemaCols.packageName)} AS package,
        pc.${quoteIdent(priceConfigCols.pctCtv)} AS pct_ctv,
        pc.${quoteIdent(priceConfigCols.pctKhach)} AS pct_khach,
        pc.${quoteIdent(priceConfigCols.pctPromo)} AS pct_promo,
        v.${quoteIdent(variantCols.isActive)} AS is_active,
        pc.${quoteIdent(priceConfigCols.updatedAt)} AS update,
        spagg.max_supply_price AS max_supply_price
      FROM ${TABLES.variant} v
      LEFT JOIN ${TABLES.product} p
        ON p.${quoteIdent(productSchemaCols.id)} = v.${quoteIdent(variantCols.productId)}
      LEFT JOIN LATERAL (
        SELECT
          pc.${quoteIdent(priceConfigCols.pctCtv)},
          pc.${quoteIdent(priceConfigCols.pctKhach)},
          pc.${quoteIdent(priceConfigCols.pctPromo)},
          pc.${quoteIdent(priceConfigCols.updatedAt)}
        FROM ${TABLES.priceConfig} pc
        WHERE pc.${quoteIdent(priceConfigCols.variantId)} = v.id
        ORDER BY pc.${quoteIdent(priceConfigCols.updatedAt)} DESC NULLS LAST
        LIMIT 1
      ) pc ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(sp.${quoteIdent(supplyPriceCols.price)}) AS max_supply_price
        FROM ${TABLES.supplyPrice} sp
        WHERE sp.${quoteIdent(supplyPriceCols.productId)} = v.id
      ) spagg ON TRUE
      WHERE v.id = ?
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
