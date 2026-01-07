const {
    DB_SCHEMA,
    tableName,
    SCHEMA_ORDERS,
    SCHEMA_PRODUCT,
    SCHEMA_PARTNER,
    PRODUCT_SCHEMA,
    PARTNER_SCHEMA,
} = require("../../config/dbSchema");

const TABLES = {
    orderList: tableName(DB_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS),
    orderExpired: tableName(DB_SCHEMA.ORDER_EXPIRED.TABLE, SCHEMA_ORDERS),
    orderCanceled: tableName(DB_SCHEMA.ORDER_CANCELED.TABLE, SCHEMA_ORDERS),
    supply: tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_PARTNER),
    packageProduct: tableName(DB_SCHEMA.PACKAGE_PRODUCT.TABLE),
    supplyPrice: tableName(PARTNER_SCHEMA.SUPPLIER_COST.TABLE, SCHEMA_PARTNER),
    variant: tableName(PRODUCT_SCHEMA.VARIANT.TABLE, SCHEMA_PRODUCT),
    priceConfig: tableName(PRODUCT_SCHEMA.PRICE_CONFIG.TABLE, SCHEMA_PRODUCT),
};

const COLS = {
    ORDER: DB_SCHEMA.ORDER_LIST.COLS,
    SUPPLY_PRICE: PARTNER_SCHEMA.SUPPLIER_COST.COLS,
    SUPPLY: PARTNER_SCHEMA.SUPPLIER.COLS,
    VARIANT: PRODUCT_SCHEMA.VARIANT.COLS,
    PRICE_CONFIG: PRODUCT_SCHEMA.PRICE_CONFIG.COLS,
};

// Giữ nguyên trạng thái gốc (đúng với dữ liệu hiện tại)
const STATUS = {
    PAID: "Đã Thanh Toán",
    UNPAID: "Chưa Thanh Toán",
    EXPIRED: "Hết Hạn",
    RENEWAL: "Cần Gia Hạn",
    REFUNDED: "Đã Hoàn",
    PENDING_REFUND: "Chưa Hoàn"
};

module.exports = {
    TABLES,
    COLS,
    STATUS,
};
