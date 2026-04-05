const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../../config/dbSchema");
const { STATUS } = require("../constants");
const { toNullableNumber } = require("../../../utils/normalizers");
const { quoteIdent } = require("../../../utils/sql");
const { isMavnImportOrder } = require("../../../utils/orderHelpers");

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const summaryTableBase = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE;

/** Trong ON CONFLICT DO UPDATE, tên cột trần bị ambiguous với excluded.* — phải qualify bảng. */
const qualifiedSummaryCol = (colName) => {
    const c = quoteIdent(colName);
    if (SCHEMA_FINANCE) {
        return `${quoteIdent(SCHEMA_FINANCE)}.${quoteIdent(summaryTableBase)}.${c}`;
    }
    return `${quoteIdent(summaryTableBase)}.${c}`;
};

const getMonthKey = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

// Statuses that count the order as "successful" (entered lifecycle from PROCESSING onwards)
const ORDER_COUNTED_STATUSES = [
    STATUS.PROCESSING, STATUS.PAID, STATUS.PENDING_REFUND,
    STATUS.REFUNDED, STATUS.EXPIRED, STATUS.RENEWAL,
];

// Statuses that count the order as a refund
const REFUND_COUNTED_STATUSES = [STATUS.PENDING_REFUND, STATUS.REFUNDED];

const isOrderCounted = (status) => ORDER_COUNTED_STATUSES.includes(status);
const isRefundCounted = (status) => REFUND_COUNTED_STATUSES.includes(status);

const updateDashboardMonthlySummaryOnStatusChange = async(trx, beforeRow, afterRow) => {
    const prevStatus = beforeRow?.status || STATUS.UNPAID;
    const nextStatus = afterRow?.status || STATUS.UNPAID;

    if (prevStatus === nextStatus) return;

    const orderDate = afterRow?.order_date || beforeRow?.order_date;
    if (!orderDate) return;

    const monthKey = getMonthKey(orderDate);
    if (!monthKey) return;

    const updates = {};

    // Order left the "counted" lifecycle → -1 order, -revenue, -profit
    if (isOrderCounted(prevStatus) && !isOrderCounted(nextStatus)) {
        const price = toNullableNumber(beforeRow?.price) || 0;
        const cost = toNullableNumber(beforeRow?.cost) || 0;
        const profit = price - cost;
        updates.total_orders = (updates.total_orders || 0) - 1;
        updates.total_revenue = (updates.total_revenue || 0) - price;
        updates.total_profit = (updates.total_profit || 0) - profit;
    }

    // Order left refund lifecycle → -1 canceled, -refund
    if (isRefundCounted(prevStatus) && !isRefundCounted(nextStatus)) {
        const refund = toNullableNumber(beforeRow?.refund) || 0;
        updates.canceled_orders = (updates.canceled_orders || 0) - 1;
        updates.total_refund = (updates.total_refund || 0) - refund;
    }

    // Order entered the "counted" lifecycle ONLY via PROCESSING (UNPAID/CANCELLED → PROCESSING)
    if (!isOrderCounted(prevStatus) && nextStatus === STATUS.PROCESSING) {
        const price = toNullableNumber(afterRow?.price) || 0;
        const cost = toNullableNumber(afterRow?.cost) || 0;
        const profit = price - cost;
        updates.total_orders = (updates.total_orders || 0) + 1;
        updates.total_revenue = (updates.total_revenue || 0) + price;
        updates.total_profit = (updates.total_profit || 0) + profit;
    }

    // Đơn nhập hàng MAVN: UNPAID → PAID (bỏ bước PROCESSING, không NCC) — vẫn cộng dashboard.
    if (
        !isOrderCounted(prevStatus) &&
        nextStatus === STATUS.PAID &&
        prevStatus === STATUS.UNPAID &&
        isMavnImportOrder(afterRow)
    ) {
        const price = toNullableNumber(afterRow?.price) || 0;
        const cost = toNullableNumber(afterRow?.cost) || 0;
        const profit = price - cost;
        updates.total_orders = (updates.total_orders || 0) + 1;
        updates.total_revenue = (updates.total_revenue || 0) + price;
        updates.total_profit = (updates.total_profit || 0) + profit;
    }

    // Order entered refund lifecycle (e.g. PAID → PENDING_REFUND) → +1 canceled, +refund
    if (!isRefundCounted(prevStatus) && isRefundCounted(nextStatus)) {
        const refund = toNullableNumber(afterRow?.refund) || 0;
        updates.canceled_orders = (updates.canceled_orders || 0) + 1;
        updates.total_refund = (updates.total_refund || 0) + refund;
    }

    if (Object.keys(updates).length === 0) return;

    const insertData = {
        [summaryCols.MONTH_KEY]: monthKey,
        [summaryCols.UPDATED_AT]: new Date(),
    };

    const mergeData = {
        [summaryCols.UPDATED_AT]: new Date(),
    };

    if (updates.total_orders !== undefined) {
        mergeData[summaryCols.TOTAL_ORDERS] = trx.raw(
            `GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_ORDERS)} + ${updates.total_orders})`
        );
    }

    if (updates.canceled_orders !== undefined) {
        mergeData[summaryCols.CANCELED_ORDERS] = trx.raw(
            `GREATEST(0, ${qualifiedSummaryCol(summaryCols.CANCELED_ORDERS)} + ${updates.canceled_orders})`
        );
    }

    if (updates.total_revenue !== undefined) {
        mergeData[summaryCols.TOTAL_REVENUE] = trx.raw(
            `${qualifiedSummaryCol(summaryCols.TOTAL_REVENUE)} + ${updates.total_revenue}`
        );
    }

    if (updates.total_profit !== undefined) {
        mergeData[summaryCols.TOTAL_PROFIT] = trx.raw(
            `${qualifiedSummaryCol(summaryCols.TOTAL_PROFIT)} + ${updates.total_profit}`
        );
    }

    if (updates.total_refund !== undefined) {
        mergeData[summaryCols.TOTAL_REFUND] = trx.raw(
            `GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_REFUND)} + ${updates.total_refund})`
        );
    }

    await trx(summaryTable)
        .insert(insertData)
        .onConflict(summaryCols.MONTH_KEY)
        .merge(mergeData);
};

module.exports = {
    updateDashboardMonthlySummaryOnStatusChange,
    qualifiedSummaryCol,
};
