const { DB_SCHEMA, getDefinition, tableName } = require("../../config/dbSchema");

const PACKAGE_DEF = getDefinition("PACKAGE_PRODUCT");
const ACCOUNT_DEF = getDefinition("ACCOUNT_STORAGE");
const pkgCols = PACKAGE_DEF.columns;
const accCols = ACCOUNT_DEF.columns;

const TABLES = {
  packageProduct: tableName(DB_SCHEMA.PACKAGE_PRODUCT.TABLE),
  accountStorage: tableName(DB_SCHEMA.ACCOUNT_STORAGE.TABLE),
};

module.exports = {
  PACKAGE_DEF,
  ACCOUNT_DEF,
  pkgCols,
  accCols,
  TABLES,
};
