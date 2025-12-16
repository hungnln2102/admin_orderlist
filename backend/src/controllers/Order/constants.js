const { DB_SCHEMA, tableName } = require("../../config/dbSchema");

const TABLES = {
    orderList: tableName(DB_SCHEMA.ORDER_LIST.TABLE),
    orderExpired: tableName(DB_SCHEMA.ORDER_EXPIRED.TABLE),
    orderCanceled: tableName(DB_SCHEMA.ORDER_CANCELED.TABLE),
    productPrice: tableName(DB_SCHEMA.PRODUCT_PRICE.TABLE),
    supply: tableName(DB_SCHEMA.SUPPLY.TABLE),
    packageProduct: tableName(DB_SCHEMA.PACKAGE_PRODUCT.TABLE),
    supplyPrice: tableName(DB_SCHEMA.SUPPLY_PRICE.TABLE),
};

const COLS = {
    ORDER: DB_SCHEMA.ORDER_LIST.COLS,
    PRICE: DB_SCHEMA.PRODUCT_PRICE.COLS,
    SUPPLY_PRICE: DB_SCHEMA.SUPPLY_PRICE.COLS,
    SUPPLY: DB_SCHEMA.SUPPLY.COLS,
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
