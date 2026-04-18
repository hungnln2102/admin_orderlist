const { db } = require("../../../db");
const { TABLES, COLS } = require("../constants");
const { ORDERS_SCHEMA, PARTNER_SCHEMA, PRODUCT_SCHEMA } = require("../../../config/dbSchema");
const { STATUS } = require("../../../utils/statuses");
const { ORDER_PREFIXES } = require("../../../utils/orderHelpers");
const { supplierHasAccountHolderColumn } = require("../../../utils/supplierAccountHolderColumn");

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
const paymentReceiptOrderCodeCol = ORDERS_SCHEMA.PAYMENT_RECEIPT.COLS.ORDER_CODE;
const paymentReceiptAmountCol = ORDERS_SCHEMA.PAYMENT_RECEIPT.COLS.AMOUNT;
const paymentReceiptPaidDateCol = ORDERS_SCHEMA.PAYMENT_RECEIPT.COLS.PAID_DATE;
const paymentReceiptIdCol = ORDERS_SCHEMA.PAYMENT_RECEIPT.COLS.ID;

const buildOrdersListQuery = async (scope = "") => {
    const normalizedScope = String(scope || "").toLowerCase();
    const table = TABLES.orderList;
    const includeAccountHolder = await supplierHasAccountHolderColumn(db, TABLES.supplier);

    let query = db(table)
        .leftJoin(TABLES.variant, `${table}.${idProductCol}`, `${TABLES.variant}.${variantIdCol}`)
        .leftJoin(TABLES.supplier, `${table}.${idSupplyCol}`, `${TABLES.supplier}.${supplierIdCol}`)
        .joinRaw(
            `
            LEFT JOIN LATERAL (
                SELECT
                    pr.${paymentReceiptAmountCol} AS latest_webhook_amount,
                    pr.${paymentReceiptPaidDateCol} AS latest_webhook_paid_date,
                    pr.${paymentReceiptIdCol} AS latest_webhook_receipt_id
                FROM ${TABLES.paymentReceipt} pr
                WHERE COALESCE(${table}.${idOrderCol}::text, '') <> ''
                  AND LOWER(COALESCE(pr.${paymentReceiptOrderCodeCol}::text, '')) = LOWER(${table}.${idOrderCol}::text)
                ORDER BY pr.${paymentReceiptPaidDateCol} DESC NULLS LAST, pr.${paymentReceiptIdCol} DESC
                LIMIT 1
            ) latest_pr ON TRUE
            `
        )
        .joinRaw(
            `
            LEFT JOIN LATERAL (
                SELECT
                    rcn.id AS refund_credit_note_id,
                    rcn.credit_code AS refund_credit_code,
                    rcn.available_amount AS refund_credit_available_amount,
                    rcn.status AS refund_credit_status
                FROM ${TABLES.refundCreditNotes} rcn
                WHERE rcn.source_order_list_id = ${table}.${idCol}
                  AND UPPER(COALESCE(rcn.status::text, '')) <> 'VOID'
                ORDER BY rcn.id DESC
                LIMIT 1
            ) latest_rcn ON TRUE
            `
        );

    const importPattern = `${ORDER_PREFIXES.import}%`;

    if (normalizedScope === "expired") {
        query = query.where(statusCol, STATUS.EXPIRED);
    } else if (normalizedScope === "canceled" || normalizedScope === "cancelled") {
        query = query.where((qb) =>
            qb.whereIn(statusCol, [STATUS.PENDING_REFUND, STATUS.REFUNDED]).orWhere((qb2) => {
                qb2.whereNotNull(refundCol).whereNot((w) => {
                    w.whereRaw(`${table}.${idOrderCol}::text ILIKE ?`, [importPattern]).andWhere(
                        statusCol,
                        STATUS.CANCELED
                    );
                });
            })
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
        db.raw(`${TABLES.supplier}.${supplierNameCol}::text as supply`),
        db.raw(
            `${TABLES.supplier}.${COLS.SUPPLIER.NUMBER_BANK}::text as supplier_number_bank`
        ),
        db.raw(`${TABLES.supplier}.${COLS.SUPPLIER.BIN_BANK}::text as supplier_bin_bank`),
        db.raw(`latest_pr.latest_webhook_amount::numeric as latest_webhook_amount`),
        db.raw(`latest_pr.latest_webhook_paid_date::text as latest_webhook_paid_date`),
        db.raw(`latest_pr.latest_webhook_receipt_id::bigint as latest_webhook_receipt_id`),
        db.raw(`latest_rcn.refund_credit_note_id::bigint as refund_credit_note_id`),
        db.raw(`latest_rcn.refund_credit_code::text as refund_credit_code`),
        db.raw(`latest_rcn.refund_credit_available_amount::numeric as refund_credit_available_amount`),
        db.raw(`latest_rcn.refund_credit_status::text as refund_credit_status`),
        includeAccountHolder
            ? db.raw(
                `${TABLES.supplier}.${COLS.SUPPLIER.ACCOUNT_HOLDER}::text as supplier_account_holder`
            )
            : db.raw("NULL::text as supplier_account_holder")
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
