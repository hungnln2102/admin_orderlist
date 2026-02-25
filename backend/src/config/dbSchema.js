const path = require("path");
const dotenv = require("dotenv");

// Load env from backend root so schema settings are available
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

// Helpers to resolve schema fallbacks from env vars.
const pickSchema = (...candidates) => candidates.find(Boolean);
const SCHEMA_ORDERS = pickSchema(
  process.env.DB_SCHEMA_ORDERS,
  process.env.SCHEMA_ORDERS,
  "orders"
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
  "finance"
);
const SCHEMA_IDENTITY = pickSchema(
  process.env.DB_SCHEMA_IDENTITY,
  process.env.SCHEMA_IDENTITY,
  "identity"
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
// Schema name override for supplier tables (if different from partner/product)
const SCHEMA_SUPPLIER = pickSchema(
  process.env.DB_SCHEMA_SUPPLIER,
  SCHEMA_PARTNER,
  SCHEMA_PRODUCT
);
// Schema for supplier_cost (may live with products in current DB)
const SCHEMA_SUPPLIER_COST = pickSchema(
  process.env.DB_SCHEMA_SUPPLIER_COST,
  SCHEMA_PRODUCT,
  SCHEMA_PARTNER
);
const NOTIFICATION_GROUP_ID =
  process.env.TELEGRAM_CHAT_ID || "-1002934465528";
const RENEWAL_TOPIC_ID = Number(process.env.RENEWAL_TOPIC_ID || 2);

// -----------------------
// ADMIN SCHEMA
// -----------------------
const ADMIN_SCHEMA = {
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
};

// -----------------------
// FINANCE SCHEMA
// -----------------------
const FINANCE_SCHEMA = {
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
  SAVING_GOALS: {
    TABLE: "saving_goals",
    COLS: {
      ID: "id",
      GOAL_NAME: "goal_name",
      TARGET_AMOUNT: "target_amount",
      PRIORITY: "priority",
      CREATED_AT: "created_at",
    },
  },
};

// -----------------------
// FORM_DESC SCHEMA
// -----------------------
const FORM_DESC_SCHEMA = {
  FORM_NAME: {
    TABLE: "form_name",
    COLS: {
      ID: "id",
      NAME: "name",
      DESCRIPTION: "description",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
    },
  },
  FORM_INPUT: {
    TABLE: "form_input",
    COLS: {
      ID: "id",
      FORM_ID: "form_id",
      INPUT_ID: "input_id",
      SORT_ORDER: "sort_order",
    },
  },
  INPUTS: {
    TABLE: "inputs",
    COLS: {
      ID: "id",
      INPUT_NAME: "input_name",
      INPUT_TYPE: "input_type",
      CREATED_AT: "created_at",
    },
  },
};

// -----------------------
// IDENTITY SCHEMA (accounts, roles)
// -----------------------
const IDENTITY_SCHEMA = {
  ACCOUNTS: {
    TABLE: "accounts",
    COLS: {
      ID: "id",
      EMAIL: "email",
      PASSWORD_HASH: "password_hash",
      IS_ACTIVE: "is_active",
      CREATED_AT: "created_at",
      USERNAME: "username",
      SUSPENDED_UNTIL: "suspended_until",
      BAN_REASON: "ban_reason",
      UPDATED_AT: "updated_at",
      ROLE_ID: "role_id",
    },
  },
  ROLES: {
    TABLE: "roles",
    COLS: {
      ID: "id",
      CODE: "code",
      NAME: "name",
    },
  },
};

// -----------------------
// PROMOTION SCHEMA
// -----------------------
const PROMOTION_SCHEMA = {
  ACCOUNT_PROMOTIONS: {
    TABLE: "account_promotions",
    COLS: {
      ID: "id",
      ACCOUNT_ID: "account_id",
      PROMOTION_ID: "promotion_id",
      STATUS: "status",
      ASSIGNED_AT: "assigned_at",
      USED_AT: "used_at",
      USAGE_LIMIT_PER_USER: "usage_limit_per_user",
    },
  },
  PROMOTION_CODES: {
    TABLE: "promotion_codes",
    COLS: {
      ID: "id",
      CODE: "code",
      DISCOUNT_PERCENT: "discount_percent",
      MAX_DISCOUNT_AMOUNT: "max_discount_amount",
      MIN_ORDER_AMOUNT: "min_order_amount",
      DESCRIPTION: "description",
      STATUS: "status",
      IS_PUBLIC: "is_public",
      USAGE_LIMIT: "usage_limit",
      USED_COUNT: "used_count",
      START_AT: "start_at",
      END_AT: "end_at",
      CREATED_AT: "created_at",
    },
  },
};

// -----------------------
// WALLET SCHEMA
// -----------------------
const WALLET_SCHEMA = {
  WALLET_TRANSACTIONS: {
    TABLE: "wallet_transactions",
    COLS: {
      ID: "id",
      TRANSACTION_ID: "transaction_id",
      ACCOUNT_ID: "account_id",
      TYPE: "type",
      DIRECTION: "direction",
      AMOUNT: "amount",
      BALANCE_BEFORE: "balance_before",
      BALANCE_AFTER: "balance_after",
      PROMO_CODE: "promo_code",
      CREATED_AT: "created_at",
      METHOD: "method",
      PROMOTION_ID: "promotion_id",
    },
  },
  WALLETS: {
    TABLE: "wallets",
    COLS: {
      ACCOUNT_ID: "account_id",
      BALANCE: "balance",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
    },
  },
};

// -----------------------
// ORDERS SCHEMA (includes payment/refund tables)
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
      REFUND: "refund",
      CREATED_AT: "createdate",
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
  REFUND: {
    TABLE: "refund",
    COLS: {
      ID: "id",
      ORDER_CODE: "ma_don_hang",
      PAID_DATE: "ngay_thanh_toan",
      AMOUNT: "so_tien",
    },
  },
};

const SUPPLIER_COST_DEF = {
  TABLE: "supplier_cost",
  COLS: {
    ID: "id",
    VARIANT_ID: "variant_id",
    SUPPLIER_ID: "supplier_id",
    PRICE: "price",
  },
};

// -----------------------
// PRODUCT SCHEMA
// -----------------------
const PRODUCT_SCHEMA = {
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
  CATEGORY: {
    TABLE: "category",
    COLS: {
      ID: "id",
      NAME: "name",
      COLOR: "color",
      CREATED_AT: "created_at",
    },
  },
  PRODUCT_CATEGORY: {
    TABLE: "product_category",
    COLS: {
      PRODUCT_ID: "product_id",
      CATEGORY_ID: "category_id",
    },
  },
  PRODUCT: {
    TABLE: "product",
    COLS: {
      ID: "id",
      PACKAGE_NAME: "package_name",
      IMAGE_URL: "image_url",
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
      VARIANT_ID: "variant_id",
      RULES: "rules",
      DESCRIPTION: "description",
      IMAGE_URL: "image_url",
      SHORT_DESC: "short_desc",
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
  PRODUCT_STOCK: {
    TABLE: "product_stock",
    COLS: {
      ID: "id",
      PRODUCT_TYPE: "product_type",
      ACCOUNT_USERNAME: "account_username",
      ACCOUNT_PASSWORD: "account_password",
      BACKUP_EMAIL: "backup_email",
      TWO_FA_CODE: "two_fa_code",
      NOTE: "note",
      STOCK_STATUS: "stock_status",
      CREATED_AT: "created_at",
    },
  },
  PACKAGE_PRODUCT: {
    TABLE: "package_product",
    COLS: {
      ID: "id",
      PACKAGE_ID: "package_id",
      USERNAME: "account_user",
      PASSWORD: "account_pass",
      MAIL_2ND: "recovery_mail",
      NOTE: "note",
      EXPIRED: "expiry_date",
      SUPPLIER: "supplier",
      COST: "cost",
      SLOT: "slot",
      MATCH: "match",
    },
  },
  SUPPLIER_COST: SUPPLIER_COST_DEF,
};

// -----------------------
// SUPPLIER SCHEMA
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
  PAYMENT_SUPPLY: {
    TABLE: "supplier_payments",
    COLS: {
      ID: "id",
      SOURCE_ID: "supplier_id",
      IMPORT_VALUE: "total_amount",
      ROUND: "payment_period",
      STATUS: "payment_status",
      PAID: "amount_paid",
    },
  },
  SUPPLIER_COST: SUPPLIER_COST_DEF,
};

const tableName = (name, schema) => (schema ? `${schema}.${name}` : name);

const EMPTY_SCHEMA = {};
const getTable = (key, schemaMap = EMPTY_SCHEMA) => schemaMap[key] || null;
const getColumns = (key, schemaMap = EMPTY_SCHEMA) =>
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

const getDefinition = (key, schemaMap = EMPTY_SCHEMA) => {
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
  SCHEMA_ORDERS,
  SCHEMA_PRODUCT,
  SCHEMA_ADMIN,
  SCHEMA_IDENTITY,
  SCHEMA_PROMOTION,
  SCHEMA_WALLET,
  SCHEMA_FORM_DESC,
  SCHEMA_FINANCE,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  NOTIFICATION_GROUP_ID,
  RENEWAL_TOPIC_ID,
  tableName,
  getTable,
  getColumns,
  getDefinition,
  ADMIN_SCHEMA,
  FINANCE_SCHEMA,
  IDENTITY_SCHEMA,
  PROMOTION_SCHEMA,
  WALLET_SCHEMA,
   // Form description schema
  FORM_DESC_SCHEMA,
  // Orders schema map
  ORDERS_SCHEMA,
  PRODUCT_SCHEMA,
  // Partner schema
  SCHEMA_PARTNER,
  PARTNER_SCHEMA,
};
