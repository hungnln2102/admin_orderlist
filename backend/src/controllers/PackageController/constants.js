const { DB_SCHEMA, tableName, getDefinition, SCHEMA_PRODUCT, PRODUCT_SCHEMA } = require("../../config/dbSchema");

const PACKAGE_DEF = getDefinition("PACKAGE_PRODUCT");
const ACCOUNT_DEF = getDefinition("ACCOUNT_STORAGE");
const PRODUCT_DEF = getDefinition("PRODUCT", PRODUCT_SCHEMA);
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);
const pkgCols = PACKAGE_DEF.columns;
const accCols = ACCOUNT_DEF.columns;
const productCols = PRODUCT_DEF.columns;
const variantCols = VARIANT_DEF.columns;

const TABLES = {
  packageProduct: tableName(DB_SCHEMA.PACKAGE_PRODUCT.TABLE),
  accountStorage: tableName(DB_SCHEMA.ACCOUNT_STORAGE.TABLE),
  product: tableName(PRODUCT_DEF.tableName, SCHEMA_PRODUCT),
  variant: tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT),
};

module.exports = {
  PACKAGE_DEF,
  ACCOUNT_DEF,
  PRODUCT_DEF,
  VARIANT_DEF,
  pkgCols,
  accCols,
  productCols,
  variantCols,
  TABLES,
};
