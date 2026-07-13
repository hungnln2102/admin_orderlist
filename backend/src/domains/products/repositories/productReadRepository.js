const { db } = require("../../../db");
const { quoteIdent } = require("../../../utils/sql");
const {
  variantCols,
  categoryCols,
  productCategoryCols,
  productSchemaCols,
  productDescCols,
  supplyPriceCols,
  TABLES,
  MARGIN_PIVOT_SQL,
} = require("../controller/constants");

const PRODUCT_PRICE_SELECT_SQL = `
  SELECT
    v.id AS id,
    v.${quoteIdent(variantCols.displayName)} AS id_product,
    v.${quoteIdent(variantCols.displayName)} AS san_pham,
    v.${quoteIdent(variantCols.variantName)} AS package_product,
    p.${quoteIdent(productSchemaCols.packageName)} AS package,
    v.${quoteIdent(variantCols.imageUrl)} AS image_url,
    p.${quoteIdent(productSchemaCols.imageUrl)} AS package_image_url,
    v.${quoteIdent(variantCols.basePrice)} AS base_price,
    margins.pct_ctv,
    margins.pct_khach,
    margins.pct_promo,
    margins.pct_stu,
    v.${quoteIdent(variantCols.isActive)} AS is_active,
    v.${quoteIdent(variantCols.descVariantId)} AS desc_variant_id,
    v.${quoteIdent(variantCols.updatedAt)} AS update,
    spagg.max_supply_price AS max_supply_price
  FROM ${TABLES.variant} v
  LEFT JOIN ${TABLES.product} p
    ON p.${quoteIdent(productSchemaCols.id)} = v.${quoteIdent(variantCols.productId)}
  LEFT JOIN ${TABLES.productDesc} d
    ON d.${quoteIdent(productDescCols.id)} = v.${quoteIdent(variantCols.descVariantId)}
  LEFT JOIN LATERAL (${MARGIN_PIVOT_SQL}) margins ON TRUE
  LEFT JOIN LATERAL (
    SELECT MAX(sp.${quoteIdent(supplyPriceCols.price)}) AS max_supply_price
    FROM ${TABLES.supplyPrice} sp
    WHERE sp.${quoteIdent(supplyPriceCols.variantId)} = v.id
  ) spagg ON TRUE
`;

const listProductPackageRows = async () => {
  const query = `
    SELECT
      p.${quoteIdent(productSchemaCols.id)} AS id,
      p.${quoteIdent(productSchemaCols.packageName)} AS package_name
    FROM ${TABLES.product} p
    WHERE p.${quoteIdent(productSchemaCols.packageName)} IS NOT NULL
      AND TRIM(p.${quoteIdent(productSchemaCols.packageName)}::text) != ''
    ORDER BY p.${quoteIdent(productSchemaCols.packageName)};
  `;
  const result = await db.raw(query);
  return result.rows || [];
};

const listProductRows = async () => {
  const query = `
    SELECT
      v.id AS id,
      p.${quoteIdent(productSchemaCols.id)} AS catalog_product_id,
      v.${quoteIdent(variantCols.displayName)} AS id_product,
      v.${quoteIdent(variantCols.displayName)} AS san_pham,
      v.${quoteIdent(variantCols.variantName)} AS package_product,
      p.${quoteIdent(productSchemaCols.packageName)} AS package,
      v.${quoteIdent(variantCols.imageUrl)} AS image_url,
      p.${quoteIdent(productSchemaCols.imageUrl)} AS package_image_url,
      v.${quoteIdent(variantCols.basePrice)} AS base_price,
      v.${quoteIdent(variantCols.isActive)} AS is_active,
      v.${quoteIdent(variantCols.descVariantId)} AS desc_variant_id,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', c.${quoteIdent(categoryCols.id)},
            'name', c.${quoteIdent(categoryCols.name)},
            'color', c.${quoteIdent(categoryCols.color)}
          )
        ) FILTER (WHERE c.${quoteIdent(categoryCols.id)} IS NOT NULL),
        '[]'::json
      ) AS categories
    FROM ${TABLES.variant} v
    LEFT JOIN ${TABLES.product} p
      ON p.${quoteIdent(productSchemaCols.id)} = v.${quoteIdent(variantCols.productId)}
    LEFT JOIN ${TABLES.productDesc} d
      ON d.${quoteIdent(productDescCols.id)} = v.${quoteIdent(variantCols.descVariantId)}
    LEFT JOIN ${TABLES.productCategory} pc
      ON pc.${quoteIdent(productCategoryCols.productId)} = p.${quoteIdent(productSchemaCols.id)}
    LEFT JOIN ${TABLES.category} c
      ON c.${quoteIdent(categoryCols.id)} = pc.${quoteIdent(productCategoryCols.categoryId)}
    GROUP BY
      v.id,
      p.${quoteIdent(productSchemaCols.id)},
      v.${quoteIdent(variantCols.displayName)},
      v.${quoteIdent(variantCols.variantName)},
      p.${quoteIdent(productSchemaCols.packageName)},
      p.${quoteIdent(productSchemaCols.imageUrl)},
      v.${quoteIdent(variantCols.imageUrl)},
      v.${quoteIdent(variantCols.isActive)},
      v.${quoteIdent(variantCols.descVariantId)}
    ORDER BY v.${quoteIdent(variantCols.displayName)};
  `;
  const result = await db.raw(query);
  return result.rows || [];
};

const listProductPriceRows = async () => {
  const query = `${PRODUCT_PRICE_SELECT_SQL}
    ORDER BY v.${quoteIdent(variantCols.displayName)} ASC;
  `;
  const result = await db.raw(query);
  return result.rows || [];
};

const getProductPriceRowById = async (variantId) => {
  const query = `${PRODUCT_PRICE_SELECT_SQL}
    WHERE v.id = ?
    LIMIT 1;
  `;
  const result = await db.raw(query, [variantId]);
  return result.rows?.[0] || null;
};

module.exports = {
  getProductPriceRowById,
  listProductPackageRows,
  listProductPriceRows,
  listProductRows,
};
