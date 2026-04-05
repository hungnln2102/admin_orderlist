const { SUPPLIER_COST_DEF } = require("../shared");

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
      PCT_CTV: "pct_ctv",
      PCT_KHACH: "pct_khach",
      PCT_PROMO: "pct_promo",
      PCT_STU: "pct_stu",
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

module.exports = {
  ORDERS_SCHEMA,
  PRODUCT_SCHEMA,
  PARTNER_SCHEMA,
};
