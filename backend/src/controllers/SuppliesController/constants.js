const {
  DB_SCHEMA,
  getDefinition,
  tableName,
  SCHEMA,
  SCHEMA_PRODUCT,
  SCHEMA_PARTNER,
  PRODUCT_SCHEMA,
  PARTNER_SCHEMA,
} = require("../../config/dbSchema");
const { QUOTED_COLS } = require("../../utils/columns");

const ORDER_DEF = getDefinition("ORDER_LIST");
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);
const SUPPLY_PRICE_DEF = getDefinition("SUPPLIER_COST", PARTNER_SCHEMA);
const SUPPLY_DEF = getDefinition("SUPPLIER", PARTNER_SCHEMA);

const orderCols = ORDER_DEF.columns;
const variantCols = VARIANT_DEF.columns;
const supplyPriceCols = SUPPLY_PRICE_DEF.columns;
const supplyCols = SUPPLY_DEF.columns;

const TABLES = {
  orderList: tableName(DB_SCHEMA.ORDER_LIST.TABLE),
  orderExpired: tableName(DB_SCHEMA.ORDER_EXPIRED.TABLE),
  orderCanceled: tableName(DB_SCHEMA.ORDER_CANCELED.TABLE),
  supply: tableName(SUPPLY_DEF.tableName, SCHEMA_PRODUCT),
  supplyPrice: tableName(SUPPLY_PRICE_DEF.tableName, SCHEMA_PRODUCT),
  variant: tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT),
  paymentSupply: tableName(DB_SCHEMA.PAYMENT_SUPPLY.TABLE),
};

const STATUS = {
  UNPAID: "Chưa Thanh Toán",
  PAID: "Đã Thanh Toán",
  COLLECTED: "Đã Thu",
  PAID_ALT: "Thanh Toán",
  CANCELED: "Hủy",
  REFUNDED: "Đã Hoàn",
  PENDING_REFUND: "Chưa Hoàn",
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
  QUOTED_COLS,
  SCHEMA,
  SUPPLY_STATUS_CANDIDATES,
  DB_SCHEMA,
};
