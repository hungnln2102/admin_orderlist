const { db } = require("../../../db");
const { TABLES, COLS } = require("../constants");
const {
    ORDERS_SCHEMA,
    RECEIPT_SCHEMA,
    PARTNER_SCHEMA,
    PRODUCT_SCHEMA,
} = require("../../../config/dbSchema");
const { STATUS } = require("../../../utils/statuses");
const { ORDER_PREFIXES } = require("../../../utils/orderHelpers");
const { supplierHasAccountHolderColumn } = require("../../../utils/supplierAccountHolderColumn");

const idSupplyCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
const idProductCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;
const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
const orderDateCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ORDER_DATE;
const createdAtCol = ORDERS_SCHEMA.ORDER_LIST.COLS.CREATED_AT;
const statusCol = ORDERS_SCHEMA.ORDER_LIST.COLS.STATUS;
const refundCol = ORDERS_SCHEMA.ORDER_LIST.COLS.REFUND;
const expiryCol = ORDERS_SCHEMA.ORDER_LIST.COLS.EXPIRY_DATE;
const canceledAtCol = ORDERS_SCHEMA.ORDER_LIST.COLS.CANCELED_AT;
const idCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID;
const supplierIdCol = PARTNER_SCHEMA.SUPPLIER.COLS.ID;
const supplierNameCol = "supplier_name";
const variantIdCol = PRODUCT_SCHEMA.VARIANT.COLS.ID;
const variantDisplayNameCol = PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME;
const variantProductIdCol = PRODUCT_SCHEMA.VARIANT.COLS.PRODUCT_ID;
const paymentReceiptOrderCodeCol = RECEIPT_SCHEMA.PAYMENT_RECEIPT.COLS.ORDER_CODE;
const paymentReceiptAmountCol = RECEIPT_SCHEMA.PAYMENT_RECEIPT.COLS.AMOUNT;
const paymentReceiptPaidDateCol = RECEIPT_SCHEMA.PAYMENT_RECEIPT.COLS.PAID_DATE;
const paymentReceiptIdCol = RECEIPT_SCHEMA.PAYMENT_RECEIPT.COLS.ID;
const taxOrderPatterns = ["MAVC%", "MAVL%", "MAVK%", "MAVS%"];
const RCN = RECEIPT_SCHEMA.REFUND_CREDIT_NOTES.COLS;
const RCA = RECEIPT_SCHEMA.REFUND_CREDIT_APPLICATIONS.COLS;

const buildOrdersListQuery = async (scope = "", options = {}) => {
    const normalizedScope = String(scope || "").toLowerCase();
    const table = TABLES.orderList;
    const includeAccountHolder =
        Boolean(COLS.SUPPLIER.ACCOUNT_HOLDER) &&
        await supplierHasAccountHolderColumn(db, TABLES.supplier);

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
                    COALESCE(SUM(pr_sum.${paymentReceiptAmountCol})::numeric, 0) AS total_webhook_amount
                FROM ${TABLES.paymentReceipt} pr_sum
                WHERE COALESCE(${table}.${idOrderCol}::text, '') <> ''
                  AND LOWER(COALESCE(pr_sum.${paymentReceiptOrderCodeCol}::text, '')) = LOWER(${table}.${idOrderCol}::text)
                  AND pr_sum.${paymentReceiptPaidDateCol}::date >= COALESCE(${table}.${orderDateCol}::date, '1970-01-01'::date)
            ) wh_pr_sum ON TRUE
            `
        )
        .joinRaw(
            `
            LEFT JOIN LATERAL (
                SELECT
                    rcn.${RCN.ID} AS refund_credit_note_id,
                    rcn.${RCN.CREDIT_CODE} AS refund_credit_code,
                    rcn.${RCN.AVAILABLE_AMOUNT} AS refund_credit_available_amount,
                    rcn.${RCN.STATUS} AS refund_credit_status
                FROM ${TABLES.refundCreditNotes} rcn
                WHERE rcn.${RCN.SOURCE_ORDER_LIST_ID} = ${table}.${idCol}
                  AND UPPER(COALESCE(rcn.${RCN.STATUS}::text, '')) <> 'VOID'
                ORDER BY rcn.${RCN.ID} DESC
                LIMIT 1
            ) latest_rcn ON TRUE
            `
        )
        .joinRaw(
            `
            LEFT JOIN LATERAL (
                SELECT
                    rca.${RCA.ID} AS refund_credit_application_id,
                    rca.${RCA.CREDIT_NOTE_ID} AS refund_credit_applied_note_id,
                    rca.${RCA.APPLIED_AMOUNT} AS refund_credit_applied_amount,
                    rca.${RCA.APPLIED_AT}::text AS refund_credit_applied_at,
                    -- effective_* = cùng phiếu credit_note đã apply (sau migration 085 có thể join thêm phiếu kế thừa qua succeeded_by_note_id)
                    c_applied.${RCN.ID} AS refund_credit_effective_note_id,
                    c_applied.${RCN.CREDIT_CODE} AS refund_credit_effective_code,
                    c_applied.${RCN.AVAILABLE_AMOUNT}::numeric AS refund_credit_effective_available,
                    c_applied.${RCN.STATUS}::text AS refund_credit_effective_status
                FROM ${TABLES.refundCreditApplications} rca
                INNER JOIN ${TABLES.refundCreditNotes} c_applied
                    ON c_applied.${RCN.ID} = rca.${RCA.CREDIT_NOTE_ID}
                WHERE rca.${RCA.TARGET_ORDER_LIST_ID} = ${table}.${idCol}
                ORDER BY rca.${RCA.ID} DESC
                LIMIT 1
            ) latest_rca ON TRUE
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
    } else if (normalizedScope === "mavn_paid" || normalizedScope === "mavn_expense") {
        query = query
            .where(statusCol, STATUS.PAID)
            .whereRaw(`${table}.${idOrderCol}::text ILIKE ?`, [importPattern]);
    } else if (normalizedScope === "import" || normalizedScope === "nhap") {
        query = query
            .whereNotIn(statusCol, [STATUS.EXPIRED, STATUS.PENDING_REFUND, STATUS.REFUNDED])
            .whereRaw(`${table}.${idOrderCol}::text ILIKE ?`, [importPattern]);
    } else if (normalizedScope === "tax") {
        query = query.where((qb) => {
            taxOrderPatterns.forEach((pattern) => {
                qb.orWhereRaw(`${table}.${idOrderCol}::text ILIKE ?`, [pattern]);
            });
        });
        if (options.from) {
            query = query.whereRaw(
                `COALESCE(${table}.${createdAtCol}::date, ${table}.${orderDateCol}::date) >= ?::date`,
                [options.from]
            );
        }
    } else if (normalizedScope === "package_match" || normalizedScope === "for_packages") {
        // Gói sản phẩm: chỉ đơn còn xử lý (Cần Gia Hạn, Đã Thanh Toán, Đang Xử Lý); bỏ import.
        query = query
            .whereIn(statusCol, [STATUS.RENEWAL, STATUS.PAID, STATUS.PROCESSING])
            .whereRaw(`NOT (${table}.${idOrderCol}::text ILIKE ?)`, [importPattern]);
    } else {
        query = query
            .whereNotIn(statusCol, [STATUS.EXPIRED, STATUS.PENDING_REFUND, STATUS.REFUNDED])
            .whereRaw(`NOT (${table}.${idOrderCol}::text ILIKE ?)`, [importPattern]);
    }

    const selectQuery = query.select(
        `${table}.*`,
        db.raw(`${table}.order_date::text as order_date_raw`),
        db.raw(`${table}.${createdAtCol}::text as created_at_raw`),
        db.raw(`${table}.${expiryCol}::text as expiry_date_raw`),
        db.raw(`${table}.${idProductCol}::text as variant_id`),
        db.raw(
            `COALESCE(${TABLES.variant}.${variantDisplayNameCol}::text, ${table}.${idProductCol}::text) as product_display_name`
        ),
        db.raw(
            `COALESCE(${TABLES.variant}.${variantDisplayNameCol}::text, ${table}.${idProductCol}::text) as id_product`
        ),
        db.raw(`${TABLES.variant}.${variantProductIdCol}::int as line_product_id`),
        db.raw(`${TABLES.supplier}.${supplierNameCol}::text as supply`),
        db.raw(
            `${TABLES.supplier}.${COLS.SUPPLIER.NUMBER_BANK}::text as supplier_number_bank`
        ),
        db.raw(`${TABLES.supplier}.${COLS.SUPPLIER.BIN_BANK}::text as supplier_bin_bank`),
        db.raw(`latest_pr.latest_webhook_amount::numeric as latest_webhook_amount`),
        db.raw(`latest_pr.latest_webhook_paid_date::text as latest_webhook_paid_date`),
        db.raw(`latest_pr.latest_webhook_receipt_id::bigint as latest_webhook_receipt_id`),
        db.raw(`wh_pr_sum.total_webhook_amount::numeric as total_webhook_amount`),
        db.raw(`latest_rcn.refund_credit_note_id::bigint as refund_credit_note_id`),
        db.raw(`latest_rcn.refund_credit_code::text as refund_credit_code`),
        db.raw(`latest_rcn.refund_credit_available_amount::numeric as refund_credit_available_amount`),
        db.raw(`latest_rcn.refund_credit_status::text as refund_credit_status`),
        db.raw(`latest_rca.refund_credit_application_id::bigint as refund_credit_application_id`),
        db.raw(`latest_rca.refund_credit_applied_note_id::bigint as refund_credit_applied_note_id`),
        db.raw(`latest_rca.refund_credit_applied_amount::numeric as refund_credit_applied_amount`),
        db.raw(`latest_rca.refund_credit_applied_at::text as refund_credit_applied_at`),
        db.raw(`latest_rca.refund_credit_effective_note_id::bigint as refund_credit_effective_note_id`),
        db.raw(`latest_rca.refund_credit_effective_code::text as refund_credit_effective_code`),
        db.raw(`latest_rca.refund_credit_effective_available::numeric as refund_credit_effective_available`),
        db.raw(`latest_rca.refund_credit_effective_status::text as refund_credit_effective_status`),
        db.raw(
            `(COALESCE(${table}.${ORDERS_SCHEMA.ORDER_LIST.COLS.GROSS_SELLING_PRICE}::numeric, ${table}.${COLS.ORDER.PRICE}::numeric + COALESCE(latest_rca.refund_credit_applied_amount, 0)::numeric)) as price_before_credit`
        ),
        includeAccountHolder && COLS.SUPPLIER.ACCOUNT_HOLDER
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

    if (normalizedScope === "tax") {
        return selectQuery
            .orderByRaw(`COALESCE(${table}.${createdAtCol}::date, ${table}.${orderDateCol}::date) ASC NULLS LAST`)
            .orderBy(`${table}.${idCol}`, "asc");
    }

    if (normalizedScope === "mavn_paid" || normalizedScope === "mavn_expense") {
        return selectQuery
            .orderByRaw(`COALESCE(${table}.${createdAtCol}::timestamptz, ${table}.${orderDateCol}::timestamptz) DESC NULLS LAST`)
            .orderBy(`${table}.${idCol}`, "desc");
    }

    return selectQuery;
};

module.exports = {
    buildOrdersListQuery,
};
