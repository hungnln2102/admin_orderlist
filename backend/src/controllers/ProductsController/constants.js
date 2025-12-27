const { DB_SCHEMA, getDefinition, tableName } = require("../../config/dbSchema");
const { QUOTED_COLS } = require("../../utils/columns");

const PRODUCT_PRICE_DEF = getDefinition("PRODUCT_PRICE");
const SUPPLY_PRICE_DEF = getDefinition("SUPPLY_PRICE");
const SUPPLY_DEF = getDefinition("SUPPLY");

const productCols = PRODUCT_PRICE_DEF.columns;
const supplyPriceCols = SUPPLY_PRICE_DEF.columns;
const supplyCols = SUPPLY_DEF.columns;

const TABLES = {
  productPrice: tableName(DB_SCHEMA.PRODUCT_PRICE.TABLE),
  supplyPrice: tableName(DB_SCHEMA.SUPPLY_PRICE.TABLE),
  supply: tableName(DB_SCHEMA.SUPPLY.TABLE),
};

module.exports = {
  PRODUCT_PRICE_DEF,
  SUPPLY_PRICE_DEF,
  SUPPLY_DEF,
  productCols,
  supplyPriceCols,
  supplyCols,
  TABLES,
  QUOTED_COLS,
};
