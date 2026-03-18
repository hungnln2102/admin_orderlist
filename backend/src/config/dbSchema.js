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
/** Schema chứa bảng customer_profiles (mặc định = identity; nếu bảng nằm ở public thì set DB_SCHEMA_CUSTOMER_PROFILES=public) */
const SCHEMA_CUSTOMER_PROFILES = pickSchema(
  process.env.DB_SCHEMA_CUSTOMER_PROFILES,
  SCHEMA_IDENTITY
);
/** Schema chứa bảng mail_backup (mặc định = system_automation, cùng schema với renew-adobe accounts; override bằng DB_SCHEMA_MAIL_BACKUP nếu cần) */
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
  process.env.DB_SCHEMA_RENEW_ADOBE,
  process.env.SCHEMA_RENEW_ADOBE,
  "system_automation"
);
const SCHEMA_KEY_ACTIVE = pickSchema(
  process.env.DB_SCHEMA_KEY_ACTIVE,
  process.env.SCHEMA_KEY_ACTIVE,
  "key_active"
);
// Bảng inputs có thể ở schema khác (vd: public) - dùng DB_SCHEMA_INPUTS nếu cần
const SCHEMA_INPUTS = pickSchema(
  process.env.DB_SCHEMA_INPUTS,
  process.env.SCHEMA_INPUTS,
  SCHEMA_FORM_DESC
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
      MAIL_BACKUP_ID: "mail_backup_id",
    },
  },
  MAIL_BACKUP: {
    TABLE: "mail_backup",
    COLS: {
      ID: "id",
      EMAIL: "email",
      APP_PASSWORD: "app_password",
      NOTE: "note",
      PROVIDER: "provider",
      IS_ACTIVE: "is_active",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
      ALIAS_PREFIX: "alias_prefix",
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
  CUSTOMER_PROFILES: {
    TABLE: "customer_profiles",
    COLS: {
      ID: "id",
      ACCOUNT_ID: "account_id",
      FIRST_NAME: "first_name",
      LAST_NAME: "last_name",
      DATE_OF_BIRTH: "date_of_birth",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
      TIER_ID: "tier_id",
    },
  },
};

// -----------------------
// COMMON SCHEMA (status, enums dùng chung)
// -----------------------
const COMMON_SCHEMA = {
  STATUS: {
    TABLE: "status",
    COLS: {
      CODE: "code",
      LABEL_VI: "label_vi",
      LABEL_EN: "label_en",
      DESCRIPTION: "description",
      SORT_ORDER: "sort_order",
      IS_ACTIVE: "is_active",
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
// ORDERS SCHEMA (order_list duy nhất + payment tables)
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
      EXPIRY_DATE: "expired_at",
      ID_SUPPLY: "supply_id",
      COST: "cost",
      PRICE: "price",
      NOTE: "note",
      STATUS: "status",
      REFUND: "refund",
      CANCELED_AT: "canceled_at",
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
    CREATED_AT: "created_at",
    UPDATED_AT: "updated_at",
  },
};

// -----------------------
// SYSTEM AUTOMATION (schema system_automation: accounts_admin, product_system)
// -----------------------
// Bảng accounts_admin (renew-adobe): id, email, password_enc, org_name, license_status, license_detail,
// user_count, users_snapshot, alert_config (jsonb), last_checked, is_active, created_at, mail_backup_id, url_access (text)
// Bảng product_system: ánh xạ variant_id → system_code (fix_adobe_edu, renew_adobe, renew_zoom, otp_netflix...) cho job hàng loạt
const RENEW_ADOBE_SCHEMA = {
  ACCOUNT: {
    TABLE: "accounts_admin",
    COLS: {
      ID: "id",
      EMAIL: "email",
      PASSWORD_ENC: "password_enc",
      ORG_NAME: "org_name",
      LICENSE_STATUS: "license_status",
      LICENSE_DETAIL: "license_detail",
      USER_COUNT: "user_count",
      USERS_SNAPSHOT: "users_snapshot",
      ALERT_CONFIG: "alert_config",
      LAST_CHECKED: "last_checked",
      IS_ACTIVE: "is_active",
      CREATED_AT: "created_at",
      MAIL_BACKUP_ID: "mail_backup_id",
      URL_ACCESS: "url_access",
    },
  },
  PRODUCT_SYSTEM: {
    TABLE: "product_system",
    COLS: {
      ID: "id",
      VARIANT_ID: "variant_id",
      SYSTEM_CODE: "system_code",
      CREATED_AT: "created_at",
    },
  },
  USER_ACCOUNT_MAPPING: {
    TABLE: "user_account_mapping",
    COLS: {
      ID: "id",
      USER_EMAIL: "user_email",
      ORDER_ID: "id_order",          // order code từ orders.order_list.id_order
      ADOBE_ACCOUNT_ID: "adobe_account_id", // nullable: ID accounts_admin đang dùng
      ASSIGNED_AT: "assigned_at",
      UPDATED_AT: "updated_at",
    },
  },
};

// -----------------------
// KEY_ACTIVE SCHEMA
// -----------------------
const KEY_ACTIVE_SCHEMA = {
  ORDER_AUTO_KEYS: {
    TABLE: "order_auto_keys",
    COLS: {
      ORDER_CODE: "order_code",
      AUTO_KEY: "auto_key",
      CREATED_AT: "created_at",
      SYSTEM_CODE: "system_code",
    },
  },
  SYSTEMS: {
    TABLE: "systems",
    COLS: {
      SYSTEM_CODE: "system_code",
      SYSTEM_NAME: "system_name",
      CREATED_AT: "created_at",
    },
  },
};

// -----------------------
// PRODUCT SCHEMA
// -----------------------
const PRODUCT_SCHEMA = {
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
      UPDATED_AT: "updated_at",
      IS_ACTIVE: "is_active",
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
      CREATED_AT: "created_at",
      FORM_ID: "form_id",
      UPDATED_AT: "updated_at",
      SHORT_DESC: "short_desc",
      DESCRIPTION: "description",
      RULES: "rules",
      IMAGE_URL: "image_url",
      PCT_CTV: "pct_ctv",
      PCT_KHACH: "pct_khach",
      PCT_PROMO: "pct_promo",
    },
  },
  // Alias logic cũ cho product_desc: hiện tại tất cả dữ liệu mô tả
  // (rules, description, short_desc, image_url) đã được gộp vào bảng variant.
  // Để tránh phải sửa quá nhiều code, cấu hình PRODUCT_DESC được trỏ sang
  // chính bảng variant, với VARIANT_ID ánh xạ về ID.
  PRODUCT_DESC: {
    TABLE: "variant",
    COLS: {
      ID: "id",
      VARIANT_ID: "id", // alias: trước đây product_desc.variant_id, giờ dùng variant.id
      RULES: "rules",
      DESCRIPTION: "description",
      IMAGE_URL: "image_url",
      SHORT_DESC: "short_desc",
      UPDATED_AT: "updated_at",
    },
  },
  PRODUCT_STOCK: {
    TABLE: "product_stocks",
    COLS: {
      ID: "id",
      PRODUCT_TYPE: "product_type",
      ACCOUNT_USERNAME: "account_username",
      BACKUP_EMAIL: "backup_email",
      PASSWORD_ENCRYPTED: "password_encrypted",
      TWO_FA_ENCRYPTED: "two_fa_encrypted",
      STATUS: "status",
      EXPIRES_AT: "expires_at",
      IS_VERIFIED: "is_verified",
      NOTE: "note",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
    },
  },
  PACKAGE_PRODUCT: {
    TABLE: "package_product",
    COLS: {
      ID: "id",
      PACKAGE_ID: "package_id",
      SUPPLIER: "supplier",
      COST: "cost",
      SLOT: "slot",
      MATCH: "match",
      STOCK_ID: "stock_id",
      STORAGE_ID: "storage_id",
      STORAGE_TOTAL: "storage_total",
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

// PostgreSQL: unquoted identifiers fold to lowercase; chuẩn hóa schema để tránh "Identity" vs "identity"
const tableName = (name, schema) =>
  schema ? `${String(schema).toLowerCase()}.${name}` : name;

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
  SCHEMA_CUSTOMER_PROFILES,
  SCHEMA_MAIL_BACKUP,
  SCHEMA_COMMON,
  SCHEMA_PROMOTION,
  SCHEMA_WALLET,
  SCHEMA_FORM_DESC,
  SCHEMA_INPUTS,
  SCHEMA_FINANCE,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  SCHEMA_RENEW_ADOBE,
  SCHEMA_KEY_ACTIVE,
  NOTIFICATION_GROUP_ID,
  RENEWAL_TOPIC_ID,
  tableName,
  getTable,
  getColumns,
  getDefinition,
  ADMIN_SCHEMA,
  FINANCE_SCHEMA,
  COMMON_SCHEMA,
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
  // Renew Adobe
  RENEW_ADOBE_SCHEMA,
  // Key Active
  KEY_ACTIVE_SCHEMA,
};
