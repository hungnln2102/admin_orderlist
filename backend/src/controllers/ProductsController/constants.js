const {
  getDefinition,
  tableName,
  SCHEMA_PRODUCT,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  PRODUCT_SCHEMA,
  PARTNER_SCHEMA,
  PRICING_TIER_SCHEMA,
} = require("../../config/dbSchema");
const { QUOTED_COLS } = require("../../utils/columns");

const PRODUCT_DEF = getDefinition("PRODUCT", PRODUCT_SCHEMA);
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);
const CATEGORY_DEF = getDefinition("CATEGORY", PRODUCT_SCHEMA);
const PRODUCT_CATEGORY_DEF = getDefinition("PRODUCT_CATEGORY", PRODUCT_SCHEMA);
const PRODUCT_DESC_DEF = getDefinition("PRODUCT_DESC", PRODUCT_SCHEMA);
const SUPPLIER_COST_DEF = getDefinition("SUPPLIER_COST", PARTNER_SCHEMA);
const SUPPLIER_DEF = getDefinition("SUPPLIER", PARTNER_SCHEMA);

const productSchemaCols = PRODUCT_DEF.columns;
const variantCols = VARIANT_DEF.columns;
const categoryCols = CATEGORY_DEF.columns;
const productCategoryCols = PRODUCT_CATEGORY_DEF.columns;
const productDescCols = PRODUCT_DESC_DEF.columns;
const supplyPriceCols = SUPPLIER_COST_DEF.columns;
const supplyCols = SUPPLIER_DEF.columns;
// Alias for backward compatibility
const productCols = productSchemaCols;

const TABLES = {
  product: tableName(PRODUCT_DEF.tableName, SCHEMA_PRODUCT),
  variant: tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT),
  category: tableName(CATEGORY_DEF.tableName, SCHEMA_PRODUCT),
  productCategory: tableName(PRODUCT_CATEGORY_DEF.tableName, SCHEMA_PRODUCT),
  productDesc: tableName(PRODUCT_DESC_DEF.tableName, SCHEMA_PRODUCT),
  supplyPrice: tableName(SUPPLIER_COST_DEF.tableName, SCHEMA_SUPPLIER_COST),
  supply: tableName(SUPPLIER_DEF.tableName, SCHEMA_SUPPLIER),
  pricingTier: tableName(PRICING_TIER_SCHEMA.PRICING_TIER.TABLE, SCHEMA_PRODUCT),
  variantMargin: tableName(PRICING_TIER_SCHEMA.VARIANT_MARGIN.TABLE, SCHEMA_PRODUCT),
};

/**
 * SQL fragment: pivot variant_margin rows into pct_ctv / pct_khach / pct_promo / pct_stu columns.
 * Usage: `LEFT JOIN LATERAL (${MARGIN_PIVOT_SQL}) margins ON TRUE`
 * Produces: margins.pct_ctv, margins.pct_khach, margins.pct_promo, margins.pct_stu
 */
const MARGIN_PIVOT_SQL = `
  SELECT
    MAX(CASE WHEN pt.key = 'ctv'      THEN vm.margin_ratio END) AS pct_ctv,
    MAX(CASE WHEN pt.key = 'customer'  THEN vm.margin_ratio END) AS pct_khach,
    MAX(CASE WHEN pt.key = 'promo'     THEN vm.margin_ratio END) AS pct_promo,
    MAX(CASE WHEN pt.key = 'student'   THEN vm.margin_ratio END) AS pct_stu
  FROM ${tableName(PRICING_TIER_SCHEMA.VARIANT_MARGIN.TABLE, SCHEMA_PRODUCT)} vm
  JOIN ${tableName(PRICING_TIER_SCHEMA.PRICING_TIER.TABLE, SCHEMA_PRODUCT)} pt ON pt.id = vm.tier_id
  WHERE vm.variant_id = v.id
`;

module.exports = {
  PRODUCT_DEF,
  VARIANT_DEF,
  CATEGORY_DEF,
  PRODUCT_CATEGORY_DEF,
  PRODUCT_DESC_DEF,
  SUPPLIER_COST_DEF,
  SUPPLIER_DEF,
  productSchemaCols,
  productCols,
  variantCols,
  categoryCols,
  productCategoryCols,
  productDescCols,
  supplyPriceCols,
  supplyCols,
  TABLES,
  QUOTED_COLS,
  MARGIN_PIVOT_SQL,
};
