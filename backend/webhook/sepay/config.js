/* Shared Sepay webhook configuration and DB handles */
require("dotenv").config();

const { Pool } = require("pg");
const { tableName, getDefinition, SCHEMA: DEFAULT_SCHEMA } = require("../../src/config/dbSchema");

const DB_SCHEMA = process.env.DB_SCHEMA || DEFAULT_SCHEMA || "mavryk";
const SEPAY_WEBHOOK_PATH = "/api/payment/notify";
const SEPAY_WEBHOOK_SECRET =
  process.env.SEPAY_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || "";
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";
const HOST = process.env.SEPAY_HOST || "0.0.0.0";
const PORT = Number(process.env.SEPAY_PORT) || 5000;

const DEFAULT_NOTIFICATION_GROUP_ID = "-1002934465528";
const DEFAULT_RENEWAL_TOPIC_ID = 2;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID =
  process.env.RENEWAL_GROUP_ID ||
  process.env.NOTIFICATION_CHAT_ID ||
  process.env.TELEGRAM_CHAT_ID ||
  DEFAULT_NOTIFICATION_GROUP_ID;
const TELEGRAM_TOPIC_ID = Number.parseInt(
  process.env.RENEWAL_TOPIC_ID || process.env.TELEGRAM_TOPIC_ID || DEFAULT_RENEWAL_TOPIC_ID,
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

// Table/column definitions
const ORDER_DEF = getDefinition("ORDER_LIST");
const PAYMENT_RECEIPT_DEF = getDefinition("PAYMENT_RECEIPT");
const PAYMENT_SUPPLY_DEF = getDefinition("PAYMENT_SUPPLY");
const PRODUCT_PRICE_DEF = getDefinition("PRODUCT_PRICE");
const SUPPLY_DEF = getDefinition("SUPPLY");
const SUPPLY_PRICE_DEF = getDefinition("SUPPLY_PRICE");

const ORDER_COLS = ORDER_DEF.columns;
const PAYMENT_RECEIPT_COLS = PAYMENT_RECEIPT_DEF.columns;
const PAYMENT_SUPPLY_COLS = PAYMENT_SUPPLY_DEF.columns;
const PRODUCT_PRICE_COLS = PRODUCT_PRICE_DEF.columns;
const SUPPLY_COLS = SUPPLY_DEF.columns;
const SUPPLY_PRICE_COLS = SUPPLY_PRICE_DEF.columns;

const PAYMENT_RECEIPT_TABLE = tableName(PAYMENT_RECEIPT_DEF.tableName, DB_SCHEMA);
const ORDER_TABLE = tableName(ORDER_DEF.tableName, DB_SCHEMA);
const PRODUCT_PRICE_TABLE = tableName(PRODUCT_PRICE_DEF.tableName, DB_SCHEMA);
const SUPPLY_TABLE = tableName(SUPPLY_DEF.tableName, DB_SCHEMA);
const SUPPLY_PRICE_TABLE = tableName(SUPPLY_PRICE_DEF.tableName, DB_SCHEMA);
const PAYMENT_SUPPLY_TABLE = tableName(PAYMENT_SUPPLY_DEF.tableName, DB_SCHEMA);

module.exports = {
  // Env/config
  DB_SCHEMA,
  SEPAY_WEBHOOK_PATH,
  SEPAY_WEBHOOK_SECRET,
  SEPAY_API_KEY,
  HOST,
  PORT,
  DEFAULT_NOTIFICATION_GROUP_ID,
  DEFAULT_RENEWAL_TOPIC_ID,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEGRAM_TOPIC_ID,
  SEND_RENEWAL_TO_TOPIC,
  // DB
  pool,
  ORDER_COLS,
  PAYMENT_RECEIPT_COLS,
  PAYMENT_SUPPLY_COLS,
  PRODUCT_PRICE_COLS,
  SUPPLY_COLS,
  SUPPLY_PRICE_COLS,
  ORDER_TABLE,
  PAYMENT_RECEIPT_TABLE,
  PRODUCT_PRICE_TABLE,
  SUPPLY_TABLE,
  SUPPLY_PRICE_TABLE,
  PAYMENT_SUPPLY_TABLE,
};
