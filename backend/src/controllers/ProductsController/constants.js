const {
  getDefinition,
  tableName,
  SCHEMA_PRODUCT,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  PRODUCT_SCHEMA,
  PARTNER_SCHEMA,
} = require("../../config/dbSchema");
const { QUOTED_COLS } = require("../../utils/columns");

const PRODUCT_DEF = getDefinition("PRODUCT", PRODUCT_SCHEMA);
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);
const PRICE_CONFIG_DEF = getDefinition("PRICE_CONFIG", PRODUCT_SCHEMA);
const SUPPLIER_COST_DEF = getDefinition("SUPPLIER_COST", PARTNER_SCHEMA);
const SUPPLIER_DEF = getDefinition("SUPPLIER", PARTNER_SCHEMA);

const productSchemaCols = PRODUCT_DEF.columns;
const variantCols = VARIANT_DEF.columns;
const priceConfigCols = PRICE_CONFIG_DEF.columns;
const supplyPriceCols = SUPPLIER_COST_DEF.columns;
const supplyCols = SUPPLIER_DEF.columns;
// Alias for backward compatibility
const productCols = productSchemaCols;

const TABLES = {
  product: tableName(PRODUCT_DEF.tableName, SCHEMA_PRODUCT),
  variant: tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT),
  priceConfig: tableName(PRICE_CONFIG_DEF.tableName, SCHEMA_PRODUCT),
  supplyPrice: tableName(SUPPLIER_COST_DEF.tableName, SCHEMA_SUPPLIER_COST),
  supply: tableName(SUPPLIER_DEF.tableName, SCHEMA_SUPPLIER),
};

module.exports = {
  PRODUCT_DEF,
  VARIANT_DEF,
  PRICE_CONFIG_DEF,
  SUPPLIER_COST_DEF,
  SUPPLIER_DEF,
  productSchemaCols,
  productCols,
  variantCols,
  priceConfigCols,
  supplyPriceCols,
  supplyCols,
  TABLES,
  QUOTED_COLS,
};
