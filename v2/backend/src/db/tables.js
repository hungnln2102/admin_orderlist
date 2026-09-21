/**
 * Quản lý tập trung Tên Bảng (TABLES), Schema (SCHEMAS) và Tên Cột (COLS) cho v2/backend.
 *
 * Mọi thay đổi về tên schema, tên bảng hoặc tên cột trong cơ sở dữ liệu sau này
 * chỉ cần điều chỉnh duy nhất tại file này.
 */

const SCHEMAS = {
  BUSINESS: process.env.DB_SCHEMA_BUSINESS || "",
  PARTNER: process.env.DB_SCHEMA_PARTNER || "",
  PRODUCT: process.env.DB_SCHEMA_PRODUCT || "",
  ORDERS: process.env.DB_SCHEMA_ORDERS || "",
  BILLING: process.env.DB_SCHEMA_BILLING || "",
  SYSTEM: process.env.DB_SCHEMA_SYSTEM || "system_automation",
};

/**
 * Hàm định dạng tên bảng có hoặc không có tiền tố schema.
 * Nếu schema là chuỗi rỗng (""), trả về tên bảng thuần túy để sử dụng cơ chế searchPath của PostgreSQL.
 */
const formatTable = (schema, table) => (schema ? `${schema}.${table}` : table);

const TABLES = {
  SUPPLIER: formatTable(SCHEMAS.PARTNER, "supplier"),
  SUPPLIER_ORDER_COST_LOG: formatTable(SCHEMAS.PARTNER, "supplier_order_cost_log"),
  SUPPLIER_COST: formatTable(SCHEMAS.PRODUCT, "supplier_cost"),
  VARIANT: formatTable(SCHEMAS.PRODUCT, "variant"),
  VARIANT_PRICE: formatTable(SCHEMAS.PRODUCT, "variant_price"),
  PRODUCT: formatTable(SCHEMAS.PRODUCT, "product"),
  ORDER_LIST: formatTable(SCHEMAS.ORDERS, "order_list"),
  REFUND_CREDIT_NOTES: formatTable(SCHEMAS.BILLING, "refund_credit_notes"),
  DOMAIN_EVENT_STORE: formatTable(SCHEMAS.SYSTEM, "domain_event_store"),
};

const COLS = {
  SUPPLIER: {
    ID: "id",
    SUPPLIER_NAME: "supplier_name",
    NUMBER_BANK: "number_bank",
    BIN_BANK: "bin_bank",
    ACCOUNT_HOLDER: "account_holder",
    ACTIVE_SUPPLY: "active_supply",
  },
  SUPPLIER_ORDER_COST_LOG: {
    ID: "id",
    ORDER_LIST_ID: "order_list_id",
    SUPPLY_ID: "supply_id",
    ID_ORDER: "id_order",
    IMPORT_COST: "import_cost",
    REFUND_AMOUNT: "refund_amount",
    NCC_PAYMENT_STATUS: "ncc_payment_status",
    LOGGED_AT: "logged_at",
  },
  VARIANT: {
    ID: "id",
    PRODUCT_ID: "product_id",
    VARIANT_NAME: "variant_name",
    DISPLAY_NAME: "display_name",
    BASE_PRICE: "base_price",
    IS_ACTIVE: "is_active",
    FORM_ID: "form_id",
    IMAGE_URL: "image_url",
    ID_DESC: "id_desc",
    CREATED_AT: "created_at",
    UPDATED_AT: "updated_at",
  },
  VARIANT_PRICE: {
    VARIANT_ID: "variant_id",
    TIER_ID: "tier_id",
    PRICE: "price",
    MARGIN_RATIO: "margin_ratio",
  },
  SUPPLIER_COST: {
    ID: "id",
    VARIANT_ID: "variant_id",
    SUPPLIER_ID: "supplier_id",
    PRICE: "price",
    CREATED_AT: "created_at",
    UPDATED_AT: "updated_at",
  },
  PRODUCT: {
    ID: "id",
    PACKAGE_NAME: "package_name",
    IS_ACTIVE: "is_active",
    PACKAGE_REQUIRES_ACTIVATION: "package_requires_activation",
    IMAGE_URL: "image_url",
    CREATED_AT: "created_at",
    UPDATED_AT: "updated_at",
  },
  ORDER_LIST: {
    ID: "id",
    ID_ORDER: "id_order",
    ID_PRODUCT: "id_product",
    INFORMATION_ORDER: "information_order",
    CUSTOMER: "customer",
    CONTACT: "contact",
    SLOT: "slot",
    ORDER_DATE: "order_date",
    DAYS: "days",
    EXPIRED_AT: "expired_at",
    SUPPLY_ID: "supply_id",
    COST: "cost",
    PRICE: "price",
    NOTE: "note",
    STATUS: "status",
    REFUND: "refund",
    CANCELED_AT: "canceled_at",
    GROSS_SELLING_PRICE: "gross_selling_price",
    TRANSACTION: "transaction",
    PAYMENT_METHOD: "payment_method",
    USDT_AMOUNT_USD: "usdt_amount_usd",
    USDT_EXCHANGE_RATE: "usdt_exchange_rate",
    USDT_WALLET_ID: "usdt_wallet_id",
    CREATED_AT: "created_at",
  },
  REFUND_CREDIT_NOTES: {
    ID: "id",
    CREDIT_CODE: "credit_code",
    SOURCE_ORDER_LIST_ID: "source_order_list_id",
    SOURCE_ORDER_CODE: "source_order_code",
    CUSTOMER_NAME: "customer_name",
    CUSTOMER_CONTACT: "customer_contact",
    REFUND_AMOUNT: "refund_amount",
    AVAILABLE_AMOUNT: "available_amount",
    STATUS: "status",
    NOTE: "note",
    SOURCE_KIND: "source_kind",
    CREATED_AT: "created_at",
    UPDATED_AT: "updated_at",
  },
  DOMAIN_EVENT_STORE: {
    ID: "id",
    EVENT_NAME: "event_name",
    AGGREGATE_TYPE: "aggregate_type",
    AGGREGATE_ID: "aggregate_id",
    PAYLOAD: "payload",
    STATUS: "status",
    ERROR_MESSAGE: "error_message",
    CREATED_AT: "created_at",
    PROCESSED_AT: "processed_at",
  },
};

module.exports = {
  SCHEMAS,
  TABLES,
  COLS,
};
