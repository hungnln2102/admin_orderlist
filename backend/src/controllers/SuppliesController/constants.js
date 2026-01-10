const {
  getDefinition,
  tableName,
  SCHEMA_ORDERS,
  SCHEMA_PRODUCT,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  SCHEMA_PARTNER,
  PRODUCT_SCHEMA,
  PARTNER_SCHEMA,
  ORDERS_SCHEMA,
} = require("../../config/dbSchema");
const { STATUS } = require("../../utils/statuses");
const { QUOTED_COLS } = require("../../utils/columns");

const ORDER_DEF = getDefinition("ORDER_LIST", ORDERS_SCHEMA);
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);
const SUPPLY_PRICE_DEF = getDefinition("SUPPLIER_COST", PARTNER_SCHEMA);
const SUPPLY_DEF = getDefinition("SUPPLIER", PARTNER_SCHEMA);

const orderCols = ORDER_DEF.columns;
const variantCols = VARIANT_DEF.columns;
const supplyPriceCols = SUPPLY_PRICE_DEF.columns;
const supplyCols = SUPPLY_DEF.columns;
const paymentSupplyCols = PARTNER_SCHEMA.PAYMENT_SUPPLY.COLS;

const TABLES = {
  orderList: tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS),
  orderExpired: tableName(ORDERS_SCHEMA.ORDER_EXPIRED.TABLE, SCHEMA_ORDERS),
  orderCanceled: tableName(ORDERS_SCHEMA.ORDER_CANCELED.TABLE, SCHEMA_ORDERS),
  supply: tableName(SUPPLY_DEF.tableName, SCHEMA_SUPPLIER),
  supplyPrice: tableName(SUPPLY_PRICE_DEF.tableName, SCHEMA_SUPPLIER_COST),
  variant: tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT),
  paymentSupply: tableName(
    PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE,
    SCHEMA_PARTNER
  ),
};


const SUPPLY_STATUS_CANDIDATES = ["status", "trang_thai", "is_active"];

module.exports = {
  ORDER_DEF,
  VARIANT_DEF,
  SUPPLY_PRICE_DEF,
  SUPPLY_DEF,
  orderCols,
  variantCols,
  supplyPriceCols,
  supplyCols,
  TABLES,
  STATUS,
  paymentSupplyCols,
  QUOTED_COLS,
  SUPPLY_STATUS_CANDIDATES,
};
