const path = require("path");
const dotenv = require("dotenv");

// Load env from backend root so DB_SCHEMA is always available
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

// Default schema used by existing dumps; override with DB_SCHEMA env if your DB uses another schema.
const SCHEMA = process.env.DB_SCHEMA || "mavryk";
const NOTIFICATION_GROUP_ID =
  process.env.NOTIFICATION_GROUP_ID || "-1002934465528";
const RENEWAL_TOPIC_ID = Number(process.env.RENEWAL_TOPIC_ID || 2);

// -----------------------
// UPPERCASE SCHEMA SOURCE
// -----------------------
const DB_SCHEMA = {
  ORDER_LIST: {
    TABLE: "order_list",
    COLS: {
      ID: "id",
      ID_ORDER: "id_order",
      ID_PRODUCT: "id_product",
      INFORMATION_ORDER: "information_order",
      CUSTOMER: "customer",
      CONTACT: "contact",
      SLOT: "slot",
      ORDER_DATE: "order_date",
      DAYS: "days",
      ORDER_EXPIRED: "order_expired",
      SUPPLY: "supply",
      COST: "cost",
      PRICE: "price",
      NOTE: "note",
      STATUS: "status",
      CHECK_FLAG: "check_flag",
    },
  },
  ORDER_EXPIRED: {
    TABLE: "order_expired",
    COLS: {
      ID: "id",
      ID_ORDER: "id_order",
      ID_PRODUCT: "id_product",
      INFORMATION_ORDER: "information_order",
      CUSTOMER: "customer",
      CONTACT: "contact",
      SLOT: "slot",
      ORDER_DATE: "order_date",
      DAYS: "days",
      ORDER_EXPIRED: "order_expired",
      SUPPLY: "supply",
      COST: "cost",
      PRICE: "price",
      NOTE: "note",
      STATUS: "status",
      CHECK_FLAG: "check_flag",
      ARCHIVED_AT: "archived_at",
    },
  },
  ORDER_CANCELED: {
    TABLE: "order_canceled",
    COLS: {
      ID: "id",
      ID_ORDER: "id_order",
      ID_PRODUCT: "id_product",
      INFORMATION_ORDER: "information_order",
      CUSTOMER: "customer",
      CONTACT: "contact",
      SLOT: "slot",
      ORDER_DATE: "order_date",
      DAYS: "days",
      ORDER_EXPIRED: "order_expired",
      SUPPLY: "supply",
      COST: "cost",
      PRICE: "price",
      NOTE: "note",
      STATUS: "status",
      CHECK_FLAG: "check_flag",
      REFUND: "refund",
      CREATED_AT: "createdate",
    },
  },
  ACCOUNT_STORAGE: {
    TABLE: "account_storage",
    COLS: {
      ID: "id",
      USERNAME: "username",
      PASSWORD: "password",
      MAIL_2ND: "mail_2nd",
      MAIL_FAMILY: "mail_family",
      STORAGE: "storage",
      NOTE: "note",
    },
  },
  WAREHOUSE: {
    TABLE: "warehouse",
    COLS: {
      ID: "id",
      CATEGORY: "category",
      ACCOUNT: "account",
      PASSWORD: "password",
      BACKUP_EMAIL: "backup_email",
      TWO_FA: "two_fa",
      STATUS: "status",
      NOTE: "note",
      CREATED_AT: "created_at",
    },
  },
  PACKAGE_PRODUCT: {
    TABLE: "package_product",
    COLS: {
      ID: "id",
      PACKAGE: "package",
      USERNAME: "username",
      PASSWORD: "password",
      MAIL_2ND: "mail_2nd",
      NOTE: "note",
      EXPIRED: "expired",
      SUPPLIER: "supplier",
      COST: "cost",
      SLOT: "slot",
      MATCH: "match",
    },
  },
  PRODUCT_PRICE: {
    TABLE: "product_price",
    COLS: {
      ID: "id",
      PRODUCT: "id_product",
      PCT_CTV: "pct_ctv",
      PCT_KHACH: "pct_khach",
      IS_ACTIVE: "is_active",
      PACKAGE: "package",
      PACKAGE_PRODUCT: "package_product",
      UPDATE_DATE: "update",
      PCT_PROMO: "pct_promo",
    },
  },
  PRODUCT_DESC: {
    TABLE: "product_desc",
    COLS: {
      ID: "id",
      PRODUCT_ID: "product_id",
      RULES: "rules",
      DESCRIPTION: "description",
      IMAGE_URL: "image_url",
    },
  },
  PAYMENT_RECEIPT: {
    TABLE: "payment_receipt",
    COLS: {
      ID: "id",
      ORDER_CODE: "id_order",
      PAID_DATE: "payment_date",
      AMOUNT: "amount",
      RECEIVER: "receiver",
      NOTE: "note",
      SENDER: "sender",
    },
  },
  PAYMENT_SUPPLY: {
    TABLE: "payment_supply",
    COLS: {
      ID: "id",
      SOURCE_ID: "source_id",
      IMPORT_VALUE: "import",
      ROUND: "round",
      STATUS: "status",
      PAID: "paid",
    },
  },
  REFUND: {
    TABLE: "refund",
    COLS: {
      ID: "id",
      ORDER_CODE: "ma_don_hang",
      PAID_DATE: "ngay_thanh_toan",
      AMOUNT: "so_tien",
    },
  },
  BANK_LIST: {
    TABLE: "bank_list",
    COLS: {
      BIN: "bin",
      BANK_NAME: "bank_name",
    },
  },
  SUPPLY: {
    TABLE: "supply",
    COLS: {
      ID: "id",
      SOURCE_NAME: "source_name",
      NUMBER_BANK: "number_bank",
      BIN_BANK: "bin_bank",
      ACTIVE_SUPPLY: "active_supply",
    },
  },
  SUPPLY_PRICE: {
    TABLE: "supply_price",
    COLS: {
      ID: "id",
      PRODUCT_ID: "product_id",
      SOURCE_ID: "source_id",
      PRICE: "price",
    },
  },
  USERS: {
    TABLE: "users",
    COLS: {
      ID: "userid",
      USERNAME: "username",
      PASSWORD: "passwordhash",
      ROLE: "role",
      CREATED_AT: "createdat",
    },
  },
  PURCHASE_ORDER: {
    TABLE: "purchase_order",
    COLS: {},
  },
};

const tableName = (name, schema = SCHEMA) =>
  schema ? `${schema}.${name}` : name;

const getTable = (key) => DB_SCHEMA[key] || null;
const getColumns = (key) => (DB_SCHEMA[key] ? DB_SCHEMA[key].COLS || {} : {});

// Helpers to derive camelCase column maps on demand (per consumer)
const toCamel = (key = "") =>
  String(key)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part, idx) =>
      idx === 0 ? part : part[0].toUpperCase() + part.slice(1)
    )
    .join("");

const getDefinition = (key) => {
  const entry = DB_SCHEMA[key];
  if (!entry) return null;
  const columns = Object.fromEntries(
    Object.entries(entry.COLS || {}).map(([colKey, colName]) => [
      toCamel(colKey),
      colName,
    ])
  );
  return {
    tableName: entry.TABLE,
    columns,
  };
};

module.exports = {
  // Environment + helpers
  SCHEMA,
  NOTIFICATION_GROUP_ID,
  RENEWAL_TOPIC_ID,
  tableName,
  getTable,
  getColumns,
  getDefinition,
  // Primary schema
  DB_SCHEMA,
};
