const { DB_SCHEMA, getDefinition, tableName, SCHEMA } = require("../../config/dbSchema");
const { QUOTED_COLS } = require("../../utils/columns");

const ORDER_DEF = getDefinition("ORDER_LIST");
const PRODUCT_PRICE_DEF = getDefinition("PRODUCT_PRICE");
const SUPPLY_PRICE_DEF = getDefinition("SUPPLY_PRICE");

const orderCols = ORDER_DEF.columns;
const productPriceCols = PRODUCT_PRICE_DEF.columns;
const supplyPriceCols = SUPPLY_PRICE_DEF.columns;

const TABLES = {
  orderList: tableName(DB_SCHEMA.ORDER_LIST.TABLE),
  orderExpired: tableName(DB_SCHEMA.ORDER_EXPIRED.TABLE),
  orderCanceled: tableName(DB_SCHEMA.ORDER_CANCELED.TABLE),
  supply: tableName(DB_SCHEMA.SUPPLY.TABLE),
  supplyPrice: tableName(DB_SCHEMA.SUPPLY_PRICE.TABLE),
  productPrice: tableName(DB_SCHEMA.PRODUCT_PRICE.TABLE),
  paymentSupply: tableName(DB_SCHEMA.PAYMENT_SUPPLY.TABLE),
  bankList: tableName(DB_SCHEMA.BANK_LIST.TABLE),
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
  PRODUCT_PRICE_DEF,
  SUPPLY_PRICE_DEF,
  orderCols,
  productPriceCols,
  supplyPriceCols,
  TABLES,
  STATUS,
  QUOTED_COLS,
  SCHEMA,
  SUPPLY_STATUS_CANDIDATES,
};
