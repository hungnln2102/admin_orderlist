const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", "..", ".env") });

const pickSchema = (...candidates) => candidates.find(Boolean);

const SCHEMA_ORDERS = pickSchema(
  process.env.DB_SCHEMA_ORDERS,
  process.env.SCHEMA_ORDERS,
  "orders"
);
const SCHEMA_RECEIPT = pickSchema(
  process.env.DB_SCHEMA_RECEIPT,
  process.env.SCHEMA_RECEIPT,
  "receipt"
);
const SCHEMA_PRODUCT = pickSchema(
  process.env.DB_SCHEMA_PRODUCT,
  process.env.SCHEMA_PRODUCT,
  "product"
);
const SCHEMA_PARTNER = pickSchema(
  process.env.DB_SCHEMA_PARTNER,
  process.env.SCHEMA_PARTNER,
  "partner"
);
const SCHEMA_ADMIN = pickSchema(
  process.env.DB_SCHEMA_ADMIN,
  process.env.SCHEMA_ADMIN,
  "admin"
);
const SCHEMA_FINANCE = pickSchema(
  process.env.DB_SCHEMA_FINANCE,
  process.env.SCHEMA_FINANCE,
  process.env.DB_SCHEMA_DASHBOARD,
  process.env.SCHEMA_DASHBOARD,
  "dashboard"
);
const SCHEMA_IDENTITY = pickSchema(
  process.env.DB_SCHEMA_CUSTOMER_WEB,
  process.env.SCHEMA_CUSTOMER_WEB,
  "customer_web"
);
const SCHEMA_CUSTOMER_PROFILES = pickSchema(
  process.env.DB_SCHEMA_CUSTOMER_PROFILES,
  SCHEMA_IDENTITY
);
const SCHEMA_MAIL_BACKUP = pickSchema(
  process.env.DB_SCHEMA_MAIL_BACKUP,
  process.env.DB_SCHEMA_RENEW_ADOBE,
  process.env.SCHEMA_RENEW_ADOBE,
  "system_automation"
);
const SCHEMA_COMMON = pickSchema(
  process.env.DB_SCHEMA_COMMON,
  process.env.SCHEMA_COMMON,
  "common"
);
const SCHEMA_PROMOTION = pickSchema(
  process.env.DB_SCHEMA_PROMOTION,
  process.env.SCHEMA_PROMOTION,
  "promotion"
);
const SCHEMA_WALLET = pickSchema(
  process.env.DB_SCHEMA_WALLET,
  process.env.SCHEMA_WALLET,
  "wallet"
);
const SCHEMA_FORM_DESC = pickSchema(
  process.env.DB_SCHEMA_FORM_DESC,
  process.env.SCHEMA_FORM_DESC,
  "form_desc"
);
const SCHEMA_RENEW_ADOBE = pickSchema(
  process.env.DB_SCHEMA_SYSTEM_AUTOMATION,
  process.env.SCHEMA_SYSTEM_AUTOMATION,
  process.env.DB_SCHEMA_RENEW_ADOBE,
  process.env.SCHEMA_RENEW_ADOBE,
  "system_automation"
);
const SCHEMA_KEY_ACTIVE = pickSchema(
  process.env.DB_SCHEMA_SYSTEM_AUTOMATION,
  process.env.SCHEMA_SYSTEM_AUTOMATION,
  process.env.DB_SCHEMA_RENEW_ADOBE,
  process.env.SCHEMA_RENEW_ADOBE,
  "system_automation"
);
const SCHEMA_INPUTS = pickSchema(
  process.env.DB_SCHEMA_INPUTS,
  process.env.SCHEMA_INPUTS,
  SCHEMA_FORM_DESC
);
const SCHEMA_SUPPLIER = pickSchema(
  process.env.DB_SCHEMA_SUPPLIER,
  SCHEMA_PARTNER,
  SCHEMA_PRODUCT
);
const SCHEMA_SUPPLIER_COST = pickSchema(
  process.env.DB_SCHEMA_SUPPLIER_COST,
  SCHEMA_PRODUCT,
  SCHEMA_PARTNER
);

const NOTIFICATION_GROUP_ID = process.env.TELEGRAM_CHAT_ID || "";
const RENEWAL_TOPIC_ID = Number(process.env.RENEWAL_TOPIC_ID) || 0;

module.exports = {
  pickSchema,
  SCHEMA_ORDERS,
  SCHEMA_RECEIPT,
  SCHEMA_PRODUCT,
  SCHEMA_PARTNER,
  SCHEMA_ADMIN,
  SCHEMA_FINANCE,
  SCHEMA_IDENTITY,
  SCHEMA_CUSTOMER_PROFILES,
  SCHEMA_MAIL_BACKUP,
  SCHEMA_COMMON,
  SCHEMA_PROMOTION,
  SCHEMA_WALLET,
  SCHEMA_FORM_DESC,
  SCHEMA_RENEW_ADOBE,
  SCHEMA_KEY_ACTIVE,
  SCHEMA_INPUTS,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  NOTIFICATION_GROUP_ID,
  RENEWAL_TOPIC_ID,
};
