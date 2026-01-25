/* Shared Sepay webhook configuration and DB handles */
require("dotenv").config();

const { Pool } = require("pg");
const {
  tableName,
  getDefinition,
  SCHEMA_ORDERS,
  SCHEMA_PARTNER,
  SCHEMA_PRODUCT,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  PRODUCT_SCHEMA,
  PARTNER_SCHEMA,
  ORDERS_SCHEMA,
} = require("../../src/config/dbSchema");

const SEPAY_WEBHOOK_PATH = "/api/payment/notify";
const SEPAY_WEBHOOK_SECRET =
  process.env.SEPAY_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || "";
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";
const HOST = process.env.SEPAY_HOST || "0.0.0.0";
const PORT = Number(process.env.SEPAY_PORT) || 5000;

// All sensitive values must come from environment variables
// No hardcoded defaults for security reasons
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID =
  process.env.RENEWAL_GROUP_ID ||
  process.env.NOTIFICATION_CHAT_ID ||
  process.env.TELEGRAM_CHAT_ID ||
  process.env.ORDER_NOTIFICATION_CHAT_ID ||
  "";
const TELEGRAM_TOPIC_ID = Number.parseInt(
  process.env.RENEWAL_TOPIC_ID || 
  process.env.TELEGRAM_TOPIC_ID || 
  process.env.ORDER_NOTIFICATION_TOPIC_ID ||
  process.env.ORDER_TOPIC_ID ||
  "2",
  10
);
const SEND_RENEWAL_TO_TOPIC =
  String(process.env.SEND_RENEWAL_TO_TOPIC || "true").toLowerCase() !== "false";

// Postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
});

// --------------------------------
// GET table and column definitions
// --------------------------------
const ORDER_DEF = getDefinition("ORDER_LIST", ORDERS_SCHEMA);
const PAYMENT_RECEIPT_DEF = getDefinition("PAYMENT_RECEIPT", ORDERS_SCHEMA);
const PAYMENT_SUPPLY_DEF = getDefinition("PAYMENT_SUPPLY", PARTNER_SCHEMA);
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);
const PRICE_CONFIG_DEF = getDefinition("PRICE_CONFIG", PRODUCT_SCHEMA);
const SUPPLIER_DEF = getDefinition("SUPPLIER", PARTNER_SCHEMA);
const SUPPLIER_COST_DEF = getDefinition("SUPPLIER_COST", PARTNER_SCHEMA);

// --------------------------------
// EXPORT table and column names
// --------------------------------
const ORDER_COLS = ORDER_DEF.columns;
const PAYMENT_RECEIPT_COLS = PAYMENT_RECEIPT_DEF.columns;
const PAYMENT_SUPPLY_COLS = PAYMENT_SUPPLY_DEF.columns;
const VARIANT_COLS = VARIANT_DEF.columns;
const PRICE_CONFIG_COLS = PRICE_CONFIG_DEF.columns;
const SUPPLIER_COLS = SUPPLIER_DEF.columns;
const SUPPLIER_COST_COLS = SUPPLIER_COST_DEF.columns;


// --------------------------------
// EXPORT full table names with schema
// --------------------------------
const PAYMENT_RECEIPT_TABLE = tableName(
  PAYMENT_RECEIPT_DEF.tableName,
  SCHEMA_ORDERS
);
const ORDER_TABLE = tableName(ORDER_DEF.tableName, SCHEMA_ORDERS);
const VARIANT_TABLE = tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT);
const PRICE_CONFIG_TABLE = tableName(PRICE_CONFIG_DEF.tableName, SCHEMA_PRODUCT);
const SUPPLIER_TABLE = tableName(SUPPLIER_DEF.tableName, SCHEMA_SUPPLIER);
const SUPPLIER_COST_TABLE = tableName(SUPPLIER_COST_DEF.tableName, SCHEMA_SUPPLIER_COST);
const PAYMENT_SUPPLY_TABLE = tableName(
  PAYMENT_SUPPLY_DEF.tableName,
  SCHEMA_PARTNER
);

module.exports = {
  // Env/config
  SEPAY_WEBHOOK_PATH,
  SEPAY_WEBHOOK_SECRET,
  SEPAY_API_KEY,
  HOST,
  PORT,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEGRAM_TOPIC_ID,
  SEND_RENEWAL_TO_TOPIC,
  // DB
  pool,
  ORDER_COLS,
  PAYMENT_RECEIPT_COLS,
  PAYMENT_SUPPLY_COLS,
  VARIANT_COLS,
  PRICE_CONFIG_COLS,
  SUPPLIER_COLS,
  SUPPLIER_COST_COLS,
  ORDER_TABLE,
  PAYMENT_RECEIPT_TABLE,
  VARIANT_TABLE,
  PRICE_CONFIG_TABLE,
  SUPPLIER_TABLE,
  SUPPLIER_COST_TABLE,
  PAYMENT_SUPPLY_TABLE,
};
