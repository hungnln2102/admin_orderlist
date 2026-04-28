const {
    FINANCE_SCHEMA,
    ORDERS_SCHEMA,
    SCHEMA_FINANCE,
    SCHEMA_ORDERS,
    SCHEMA_RECEIPT,
    tableName,
} = require("../../../config/dbSchema");
const { STATUS, COLS } = require("../constants");
const { toNullableNumber } = require("../../../utils/normalizers");
const { quoteIdent } = require("../../../utils/sql");
const {
    isDashboardSalesOrder,
} = require("../../../utils/orderHelpers");
const { dashboardMonthlyTaxRatePercent } = require("../../../config/appConfig");

/** MAVC/L/K/S: lợi nhuận = giá bán - cost. */
const salesOrderProfitDeltaForDashboard = (row) => {
    if (!isDashboardSalesOrder(row)) return 0;
    const price = toNullableNumber(row?.price ?? row?.[COLS.ORDER.PRICE]) || 0;
    const cost = toNullableNumber(row?.cost ?? row?.[COLS.ORDER.COST]) || 0;
    return price - cost;
};

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const summaryTableBase = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE;
const paymentReceiptTable = tableName(ORDERS_SCHEMA.PAYMENT_RECEIPT.TABLE, SCHEMA_RECEIPT);
const paymentReceiptCols = ORDERS_SCHEMA.PAYMENT_RECEIPT.COLS;
const paymentReceiptStateTable = tableName(
    ORDERS_SCHEMA.PAYMENT_RECEIPT_FINANCIAL_STATE.TABLE,
    SCHEMA_RECEIPT
);
const paymentReceiptStateCols = ORDERS_SCHEMA.PAYMENT_RECEIPT_FINANCIAL_STATE.COLS;

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

const hasMeaningfulDate = (value) =>
    value !== undefined &&
    value !== null &&
    String(value).trim() !== "" &&
    String(value).trim().toLowerCase() !== "null";

/**
 * Tháng «birth» để merge đếm đơn & gross: COALESCE(created_at, order_date), khớp SQL aggregate.
 * Doanh thu trạng thái hoàn ở aggregate ghi theo tháng canceled_at (refundMonthKey).
 */
const monthKeyFromBirthRow = (beforeRow, afterRow) => {
    const createdRaw =
        (afterRow && hasMeaningfulDate(afterRow?.[COLS.ORDER.CREATED_AT] ?? afterRow?.created_at)
            ? (afterRow?.[COLS.ORDER.CREATED_AT] ?? afterRow?.created_at)
            : null) ||
        (beforeRow && hasMeaningfulDate(beforeRow?.[COLS.ORDER.CREATED_AT] ?? beforeRow?.created_at)
            ? (beforeRow?.[COLS.ORDER.CREATED_AT] ?? beforeRow?.created_at)
            : null);
    if (createdRaw) return getMonthKey(createdRaw);
    const orderDate = afterRow?.order_date || beforeRow?.order_date;
    return orderDate ? getMonthKey(orderDate) : null;
};

const monthKeyFromRefundRow = (beforeRow, afterRow) => {
    const canceledRaw =
        (afterRow && hasMeaningfulDate(afterRow.canceled_at) ? afterRow.canceled_at : null) ||
        (beforeRow && hasMeaningfulDate(beforeRow.canceled_at) ? beforeRow.canceled_at : null);
    const fallback = afterRow?.order_date || beforeRow?.order_date;
    const anchor = canceledRaw || fallback;
    return anchor ? getMonthKey(anchor) : null;
};

/**
 * Tính lại total_tax từ total_revenue hiện tại theo DASHBOARD_MONTHLY_TAX_RATE_PERCENT.
 * Dùng sau mọi cập nhật tổng hợp; supports Knex transaction (.raw) hoặc node-pg client (.query).
 */
const recomputeSummaryMonthTotalTax = async (executor, monthKey) => {
    if (!monthKey) return;
    const rate = Number(dashboardMonthlyTaxRatePercent) || 0;
    const taxCol = quoteIdent(summaryCols.TOTAL_TAX);
    const revCol = quoteIdent(summaryCols.TOTAL_REVENUE);
    const mkCol = quoteIdent(summaryCols.MONTH_KEY);
    if (typeof executor?.raw === "function") {
        await executor.raw(
            `UPDATE ${summaryTable} SET ${taxCol} = ROUND((${revCol})::numeric * ? / 100.0) WHERE ${mkCol} = ?`,
            [rate, monthKey]
        );
    } else {
        await executor.query(
            `UPDATE ${summaryTable} SET ${taxCol} = ROUND((${revCol})::numeric * $1 / 100.0) WHERE ${mkCol} = $2`,
            [rate, monthKey]
        );
    }
};

const hasFinancialPostedReceiptForOrder = async(trx, row) => {
    const orderCode = String(row?.id_order || row?.[COLS.ORDER.ID_ORDER] || "").trim();
    if (!orderCode) return false;
    const res = await trx.raw(
        `
            SELECT 1
            FROM ${paymentReceiptTable} pr
            INNER JOIN ${paymentReceiptStateTable} fs
              ON fs.${paymentReceiptStateCols.PAYMENT_RECEIPT_ID} = pr.${paymentReceiptCols.ID}
            WHERE LOWER(COALESCE(pr.${paymentReceiptCols.ORDER_CODE}::text, '')) = LOWER(?)
              AND fs.${paymentReceiptStateCols.IS_FINANCIAL_POSTED} = TRUE
            LIMIT 1
        `,
        [orderCode]
    );
    return Array.isArray(res?.rows) && res.rows.length > 0;
};

const mergeSummaryUpdates = async (trx, monthKey, updates) => {
    if (!monthKey || Object.keys(updates).length === 0) return;

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

    await recomputeSummaryMonthTotalTax(trx, monthKey);
};

const updateDashboardMonthlySummaryOnStatusChange = async(trx, beforeRow, afterRow) => {
    const prevStatus = beforeRow?.status || STATUS.UNPAID;
    const nextStatus = afterRow?.status || STATUS.UNPAID;

    if (prevStatus === nextStatus) return;

    const birthMonthKey = monthKeyFromBirthRow(beforeRow, afterRow);
    const refundMonthKey = monthKeyFromRefundRow(beforeRow, afterRow) || birthMonthKey;

    if (!birthMonthKey && !refundMonthKey) return;

    const revenueUpdates = {};
    const refundUpdates = {};

    // Order left counted lifecycle → trừ theo rule dashboard chỉ cho MAVC/MAVL/MAVK/MAVS.
    if (false && isOrderCounted(prevStatus) && !isOrderCounted(nextStatus)) {
        if (isDashboardSalesOrder(beforeRow)) {
            const price = toNullableNumber(beforeRow?.price) || 0;
            const profit = salesOrderProfitDeltaForDashboard(beforeRow);
            revenueUpdates.total_orders = (revenueUpdates.total_orders || 0) - 1;
            revenueUpdates.total_revenue = (revenueUpdates.total_revenue || 0) - price;
            revenueUpdates.total_profit = (revenueUpdates.total_profit || 0) - profit;
        }
    }

    // Order left refund lifecycle → -1 canceled, -refund (chỉ MAVC/MAVL/MAVK/MAVS)
    if (isDashboardSalesOrder(beforeRow) && isRefundCounted(prevStatus) && !isRefundCounted(nextStatus)) {
        const refund = toNullableNumber(beforeRow?.refund) || 0;
        refundUpdates.canceled_orders = (refundUpdates.canceled_orders || 0) - 1;
        refundUpdates.total_refund = (refundUpdates.total_refund || 0) - refund;
    }

    // Vào vòng đời đếm doanh thu: Chưa TT → ĐXL, hoặc Chưa TT → Đã TT (chỉ MAVC/MAVL/MAVK/MAVS).
    if (
        false &&
        !isOrderCounted(prevStatus) &&
        isDashboardSalesOrder(afterRow) &&
        (
            nextStatus === STATUS.PROCESSING ||
            (nextStatus === STATUS.PAID && prevStatus === STATUS.UNPAID)
        )
    ) {
        const hasPostedReceipt = await hasFinancialPostedReceiptForOrder(trx, afterRow);
        if (!hasPostedReceipt) {
            const price = toNullableNumber(afterRow?.price) || 0;
            const profit = salesOrderProfitDeltaForDashboard(afterRow);
            revenueUpdates.total_orders = (revenueUpdates.total_orders || 0) + 1;
            revenueUpdates.total_revenue = (revenueUpdates.total_revenue || 0) + price;
            revenueUpdates.total_profit = (revenueUpdates.total_profit || 0) + profit;
        }
    }

    // Vào hoàn: trừ ghi nhận giá đầy đủ ở tháng birth, cộng lại (price−refund) ở tháng canceled_at (khớp aggregate).
    if (isDashboardSalesOrder(afterRow) && prevStatus === STATUS.PAID && isRefundCounted(nextStatus)) {
        const refund = toNullableNumber(afterRow?.refund) || 0;
        refundUpdates.canceled_orders = (refundUpdates.canceled_orders || 0) + 1;
        refundUpdates.total_refund = (refundUpdates.total_refund || 0) + refund;

        if (isOrderCounted(prevStatus)) {
            const base = beforeRow || afterRow;
            const price = toNullableNumber(base?.price ?? base?.[COLS.ORDER.PRICE]) || 0;
            const margin = salesOrderProfitDeltaForDashboard(base);
            const remain = Math.max(0, price - refund);
            const proRatedProfitInCancel =
                price > 0 ? margin * (remain / price) : 0;
            if (birthMonthKey) {
                await mergeSummaryUpdates(trx, birthMonthKey, {
                    total_revenue: -price,
                    total_profit: -margin,
                });
            }
            if (refundMonthKey) {
                await mergeSummaryUpdates(trx, refundMonthKey, {
                    total_revenue: remain,
                    total_profit: proRatedProfitInCancel,
                });
            }
        }
    }

    const revenueKey = birthMonthKey;
    const refundKey = refundMonthKey;

    if (Object.keys(revenueUpdates).length > 0 && revenueKey) {
        await mergeSummaryUpdates(trx, revenueKey, revenueUpdates);
    }
    if (Object.keys(refundUpdates).length > 0 && refundKey) {
        await mergeSummaryUpdates(trx, refundKey, refundUpdates);
    }
};

module.exports = {
    updateDashboardMonthlySummaryOnStatusChange,
    qualifiedSummaryCol,
    recomputeSummaryMonthTotalTax,
};
