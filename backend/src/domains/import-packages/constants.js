/**
 * Domain: import-packages
 * Orchestration luong nhap hang + tao goi san pham trong mot atomic transaction.
 *
 * Bang su dung:
 *  - product.product_stocks (warehouse stock)
 *  - product.package_product (goi san pham)
 *  - product.import_package_rules (cau hinh per-product)
 *  - product.product (doc ten san pham)
 */
const {
  tableName,
  getDefinition,
  PRODUCT_SCHEMA,
  SCHEMA_PRODUCT,
} = require("../../config/dbSchema");

const RULE_DEF = {
  tableName: "import_package_rules",
  columns: {
    id: "id",
    productId: "product_id",
    enabled: "enabled",
    fields: "fields",
    defaultSlotLimit: "default_slot_limit",
    defaultMatchMode: "default_match_mode",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
};

const STOCK_DEF = getDefinition("PRODUCT_STOCK", PRODUCT_SCHEMA);
const PKG_DEF = getDefinition("PACKAGE_PRODUCT", PRODUCT_SCHEMA);
const PRODUCT_DEF = getDefinition("PRODUCT", PRODUCT_SCHEMA);

const TABLES = {
  rule: tableName(RULE_DEF.tableName, SCHEMA_PRODUCT),
  stock: tableName(STOCK_DEF.tableName, SCHEMA_PRODUCT),
  package: tableName(PKG_DEF.tableName, SCHEMA_PRODUCT),
  product: tableName(PRODUCT_DEF.tableName, SCHEMA_PRODUCT),
};

const ruleCols = RULE_DEF.columns;
const stockCols = STOCK_DEF.columns;
const pkgCols = PKG_DEF.columns;
const productCols = PRODUCT_DEF.columns;

module.exports = {
  TABLES,
  ruleCols,
  stockCols,
  pkgCols,
  productCols,
};
