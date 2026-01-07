const path = require("path");
const dotenv = require("dotenv");

// Load env from backend root so DB_SCHEMA is always available
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

// Default schema used by existing dumps; override with DB_SCHEMA env if your DB uses another schema.
const SCHEMA = process.env.DB_SCHEMA || "mavryk";
// Orders schema (migrated order_* tables)
const SCHEMA_ORDERS = process.env.DB_SCHEMA_ORDERS || "orders";
// Schema name for the new product namespace (same DB, different schema)
const SCHEMA_PRODUCT =
  process.env.DB_SCHEMA_PRODUCT || process.env.SCHEMA_PRODUCT || "product";
// Schema name for partners/suppliers
const SCHEMA_PARTNER =
  process.env.DB_SCHEMA_PARTNER || process.env.SCHEMA_PARTNER || "partner";
// Schema name override for supplier tables (if different from partner/product)
const SCHEMA_SUPPLIER =
  process.env.DB_SCHEMA_SUPPLIER ||
  process.env.SCHEMA_SUPPLIER ||
  SCHEMA_PARTNER ||
  SCHEMA_PRODUCT ||
  SCHEMA;
// Schema for supplier_cost (may live with products in current DB)
const SCHEMA_SUPPLIER_COST =
  process.env.DB_SCHEMA_SUPPLIER_COST ||
  process.env.SCHEMA_SUPPLIER_COST ||
  SCHEMA_PRODUCT ||
  SCHEMA_PARTNER ||
  SCHEMA;
const NOTIFICATION_GROUP_ID =
  process.env.NOTIFICATION_GROUP_ID || "-1002934465528";
const RENEWAL_TOPIC_ID = Number(process.env.RENEWAL_TOPIC_ID || 2);

// -----------------------
// ORDERS SCHEMA (separate schema for order_* tables)
// -----------------------
const ORDERS_SCHEMA = {
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
};

// -----------------------
// UPPERCASE SCHEMA SOURCE
// -----------------------
const DB_SCHEMA = {
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
  MASTER_WALLETTYPES: {
    TABLE: "master_wallettypes",
    COLS: {
      ID: "id",
      WALLET_NAME: "wallet_name",
      NOTE: "note",
      ASSET_CODE: "asset_code",
      IS_INVESTMENT: "is_investment",
      LINKED_WALLET_ID: "linked_wallet_id",
    },
  },
  TRANS_DAILYBALANCES: {
    TABLE: "trans_dailybalances",
    COLS: {
      ID: "id",
      RECORD_DATE: "record_date",
      WALLET_ID: "wallet_id",
      AMOUNT: "amount",
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

// -----------------------
// UPPERCASE SCHEMA PRODUCT
// -----------------------
const PRODUCT_SCHEMA = {
  CATEGORY: {
    TABLE: "category",
    COLS: {
      ID: "id",
      NAME: "name",
      CREATED_AT: "created_at",
    },
  },
  PRODUCT: {
    TABLE: "product",
    COLS: {
      ID: "id",
      CATEGORY_ID: "category_id",
      PACKAGE_NAME: "package_name",
    },
  },
  VARIANT: {
    TABLE: "variant",
    COLS: {
      ID: "id",
      PRODUCT_ID: "product_id",
      VARIANT_NAME: "variant_name",
      IS_ACTIVE: "is_active",
      DISPLAY_NAME: "display_name",
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
  PRICE_CONFIG: {
    TABLE: "price_config",
    COLS: {
      ID: "id",
      VARIANT_ID: "variant_id",
      PCT_CTV: "pct_ctv",
      PCT_KHACH: "pct_khach",
      PCT_PROMO: "pct_promo",
      UPDATED_AT: "updated_at",
    },
  },
};

// -----------------------
// UPPERCASE SCHEMA SUPPLIER
// -----------------------
const PARTNER_SCHEMA = {
  SUPPLIER: {
    TABLE: "supplier",
    COLS: {
      ID: "id",
      SUPPLIER_NAME: "supplier_name",
      NUMBER_BANK: "number_bank",
      BIN_BANK: "bin_bank",
      ACTIVE_SUPPLY: "active_supply",
    },
  },
  SUPPLIER_COST: {
    TABLE: "supplier_cost",
    COLS: {
      ID: "id",
      PRODUCT_ID: "product_id",
      SUPPLIER_ID: "supplier_id",
      PRICE: "price",
    },
  },
};

const tableName = (name, schema = SCHEMA) =>
  schema ? `${schema}.${name}` : name;

const getTable = (key, schemaMap = DB_SCHEMA) => schemaMap[key] || null;
const getColumns = (key, schemaMap = DB_SCHEMA) =>
  schemaMap[key] ? schemaMap[key].COLS || {} : {};

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

const getDefinition = (key, schemaMap = DB_SCHEMA) => {
  const entry = schemaMap[key];
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
  SCHEMA_ORDERS,
  SCHEMA_PRODUCT,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  NOTIFICATION_GROUP_ID,
  RENEWAL_TOPIC_ID,
  tableName,
  getTable,
  getColumns,
  getDefinition,
  // Primary schema
  DB_SCHEMA,
  // Orders schema map
  ORDERS_SCHEMA,
  PRODUCT_SCHEMA,
  // Partner schema
  SCHEMA_PARTNER,
  PARTNER_SCHEMA,
};
