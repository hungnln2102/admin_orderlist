const { SUPPLIER_COST_DEF } = require("../shared");

/** Chỉ bảng thuộc PostgreSQL schema `orders` (xem `000_consolidated_schema.sql`). */
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
      /** Giá bán (gross) trước trừ refund credit khi tạo đơn có áp credit. */
      GROSS_SELLING_PRICE: "gross_selling_price",
      NOTE: "note",
      STATUS: "status",
      REFUND: "refund",
      CANCELED_AT: "canceled_at",
      /** Mốc tạo bản ghi (dashboard theo thời điểm phát sinh). */
      CREATED_AT: "created_at",
    },
  },
  ORDER_CUSTOMER: {
    TABLE: "order_customer",
    COLS: {
      ID_ORDER: "id_order",
      ACCOUNT_ID: "account_id",
      STATUS: "status",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
      PAYMENT_ID: "payment_id",
    },
  },
};

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
      /** Form quản lý gói: có trường tài khoản kích hoạt / storage */
      PACKAGE_REQUIRES_ACTIVATION: "package_requires_activation",
    },
  },
  DESC_VARIANT: {
    TABLE: "desc_variant",
    COLS: {
      ID: "id",
      RULES: "rules",
      DESCRIPTION: "description",
      SHORT_DESC: "short_desc",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
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
      /** FK → product.desc_variant.id */
      DESC_VARIANT_ID: "id_desc",
      /** Ảnh hiển thị gói (ưu tiên trước ảnh product). */
      IMAGE_URL: "image_url",
      BASE_PRICE: "base_price",
    },
  },
  /** Alias bảng product.desc_variant (nội dung mô tả dùng chung). */
  PRODUCT_DESC: {
    TABLE: "desc_variant",
    COLS: {
      ID: "id",
      RULES: "rules",
      DESCRIPTION: "description",
      SHORT_DESC: "short_desc",
      CREATED_AT: "created_at",
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
  /** Chu kỳ TT NCC (Sepay / thủ công / confirm). Chi phí theo đơn: supplier_order_cost_log. */
  PAYMENT_SUPPLY: {
    TABLE: "supplier_payments",
    COLS: {
      ID: "id",
      SOURCE_ID: "supplier_id",
      ROUND: "payment_period",
      STATUS: "payment_status",
      CONTENT: "payment_status",
      PAID: "amount_paid",
    },
  },
  /** Log NCC: thanh toán (Chưa TT→Đã TT), gia hạn (Cần GH→ĐXL/Đã TT), archive xóa; đồng bộ cost trên dòng mới nhất khi ĐXL/Đã TT. */
  SUPPLIER_ORDER_COST_LOG: {
    TABLE: "supplier_order_cost_log",
    COLS: {
      ID: "id",
      ORDER_LIST_ID: "order_list_id",
      SUPPLY_ID: "supply_id",
      ID_ORDER: "id_order",
      IMPORT_COST: "import_cost",
      REFUND_AMOUNT: "refund_amount",
      NCC_PAYMENT_STATUS: "ncc_payment_status",
      LOGGED_AT: "logged_at",
    },
  },
  SUPPLIER_COST: SUPPLIER_COST_DEF,
};

const PRICING_TIER_SCHEMA = {
  PRICING_TIER: {
    TABLE: "pricing_tier",
    COLS: {
      ID: "id",
      KEY: "key",
      PREFIX: "prefix",
      LABEL: "label",
      PRICING_RULE: "pricing_rule",
      BASE_TIER_KEY: "base_tier_key",
      SORT_ORDER: "sort_order",
      IS_ACTIVE: "is_active",
      CREATED_AT: "created_at",
    },
  },
  VARIANT_MARGIN: {
    TABLE: "variant_margin",
    COLS: {
      VARIANT_ID: "variant_id",
      TIER_ID: "tier_id",
      MARGIN_RATIO: "margin_ratio",
    },
  },
};

module.exports = {
  ORDERS_SCHEMA,
  PRODUCT_SCHEMA,
  PARTNER_SCHEMA,
  PRICING_TIER_SCHEMA,
};
