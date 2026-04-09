const { db } = require("../../../db");
const { TABLES } = require("../constants");
const { ORDERS_SCHEMA, PARTNER_SCHEMA, PRODUCT_SCHEMA } = require("../../../config/dbSchema");
const { STATUS } = require("../../../utils/statuses");
const { ORDER_PREFIXES } = require("../../../utils/orderHelpers");

const idSupplyCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
const idProductCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;
const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
const statusCol = ORDERS_SCHEMA.ORDER_LIST.COLS.STATUS;
const refundCol = ORDERS_SCHEMA.ORDER_LIST.COLS.REFUND;
const expiryCol = ORDERS_SCHEMA.ORDER_LIST.COLS.EXPIRY_DATE;
const canceledAtCol = ORDERS_SCHEMA.ORDER_LIST.COLS.CANCELED_AT;
const idCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID;
const supplierIdCol = PARTNER_SCHEMA.SUPPLIER.COLS.ID;
const supplierNameCol = "supplier_name";
const variantIdCol = PRODUCT_SCHEMA.VARIANT.COLS.ID;
const variantDisplayNameCol = PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME;

const buildOrdersListQuery = (scope = "") => {
    const normalizedScope = String(scope || "").toLowerCase();
    const table = TABLES.orderList;

    let query = db(table)
        .leftJoin(TABLES.variant, `${table}.${idProductCol}`, `${TABLES.variant}.${variantIdCol}`)
        .leftJoin(TABLES.supplier, `${table}.${idSupplyCol}`, `${TABLES.supplier}.${supplierIdCol}`);

    const importPattern = `${ORDER_PREFIXES.nhap}%`;

    if (normalizedScope === "expired") {
        query = query.where(statusCol, STATUS.EXPIRED);
    } else if (normalizedScope === "canceled" || normalizedScope === "cancelled") {
        query = query.where((qb) =>
            qb.whereIn(statusCol, [STATUS.PENDING_REFUND, STATUS.REFUNDED]).orWhereNotNull(refundCol)
        );
    } else if (normalizedScope === "import" || normalizedScope === "nhap") {
        query = query
            .whereNotIn(statusCol, [STATUS.EXPIRED, STATUS.PENDING_REFUND, STATUS.REFUNDED])
            .whereRaw(`${table}.${idOrderCol}::text ILIKE ?`, [importPattern]);
    } else {
        query = query
            .whereNotIn(statusCol, [STATUS.EXPIRED, STATUS.PENDING_REFUND, STATUS.REFUNDED])
            .whereRaw(`NOT (${table}.${idOrderCol}::text ILIKE ?)`, [importPattern]);
    }

    const selectQuery = query.select(
        `${table}.*`,
        db.raw(`${table}.order_date::text as order_date_raw`),
        db.raw(`${table}.${expiryCol}::text as expiry_date_raw`),
        db.raw(`${table}.${idProductCol}::text as variant_id`),
        db.raw(
            `COALESCE(${TABLES.variant}.${variantDisplayNameCol}::text, ${table}.${idProductCol}::text) as product_display_name`
        ),
        db.raw(
            `COALESCE(${TABLES.variant}.${variantDisplayNameCol}::text, ${table}.${idProductCol}::text) as id_product`
        ),
        db.raw(`${TABLES.supplier}.${supplierNameCol}::text as supply`)
    );

    if (normalizedScope === "canceled" || normalizedScope === "cancelled") {
        return selectQuery
            .orderByRaw(`${table}.${canceledAtCol} DESC NULLS LAST`)
            .orderBy(`${table}.${idCol}`, "desc");
    }

    return selectQuery;
};

module.exports = {
    buildOrdersListQuery,
};
