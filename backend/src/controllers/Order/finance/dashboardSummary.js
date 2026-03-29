const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../../config/dbSchema");
const { STATUS } = require("../constants");
const { toNullableNumber } = require("../../../utils/normalizers");

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const getMonthKey = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

const updateDashboardMonthlySummaryOnStatusChange = async(trx, beforeRow, afterRow) => {
    const prevStatus = beforeRow?.status || STATUS.UNPAID;
    const nextStatus = afterRow?.status || STATUS.UNPAID;

    if (prevStatus === nextStatus) return;

    const orderDate = afterRow?.order_date || beforeRow?.order_date;
    if (!orderDate) return;

    const monthKey = getMonthKey(orderDate);
    if (!monthKey) return;

    const updates = {};

    if (prevStatus === STATUS.PAID && nextStatus !== STATUS.PAID) {
        const price = toNullableNumber(beforeRow?.price) || 0;
        const cost = toNullableNumber(beforeRow?.cost) || 0;
        const profit = price - cost;
        updates.total_orders = (updates.total_orders || 0) - 1;
        updates.total_revenue = (updates.total_revenue || 0) - price;
        updates.total_profit = (updates.total_profit || 0) - profit;
    }

    if ((prevStatus === STATUS.REFUNDED || prevStatus === STATUS.PENDING_REFUND) &&
        nextStatus !== STATUS.REFUNDED && nextStatus !== STATUS.PENDING_REFUND) {
        const refund = toNullableNumber(beforeRow?.refund) || 0;
        updates.canceled_orders = (updates.canceled_orders || 0) - 1;
        updates.total_refund = (updates.total_refund || 0) - refund;
    }

    if (nextStatus === STATUS.PAID && prevStatus !== STATUS.PAID) {
        const price = toNullableNumber(afterRow?.price) || 0;
        const cost = toNullableNumber(afterRow?.cost) || 0;
        const profit = price - cost;
        updates.total_orders = (updates.total_orders || 0) + 1;
        updates.total_revenue = (updates.total_revenue || 0) + price;
        updates.total_profit = (updates.total_profit || 0) + profit;
    }

    if ((nextStatus === STATUS.REFUNDED || nextStatus === STATUS.PENDING_REFUND) &&
        prevStatus !== STATUS.REFUNDED && prevStatus !== STATUS.PENDING_REFUND) {
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
        mergeData[summaryCols.TOTAL_ORDERS] = trx.raw(`GREATEST(0, ${summaryCols.TOTAL_ORDERS} + ${updates.total_orders})`);
    }

    if (updates.canceled_orders !== undefined) {
        mergeData[summaryCols.CANCELED_ORDERS] = trx.raw(`GREATEST(0, ${summaryCols.CANCELED_ORDERS} + ${updates.canceled_orders})`);
    }

    if (updates.total_revenue !== undefined) {
        mergeData[summaryCols.TOTAL_REVENUE] = trx.raw(`${summaryCols.TOTAL_REVENUE} + ${updates.total_revenue}`);
    }

    if (updates.total_profit !== undefined) {
        mergeData[summaryCols.TOTAL_PROFIT] = trx.raw(`${summaryCols.TOTAL_PROFIT} + ${updates.total_profit}`);
    }

    if (updates.total_refund !== undefined) {
        mergeData[summaryCols.TOTAL_REFUND] = trx.raw(`GREATEST(0, ${summaryCols.TOTAL_REFUND} + ${updates.total_refund})`);
    }

    await trx(summaryTable)
        .insert(insertData)
        .onConflict(summaryCols.MONTH_KEY)
        .merge(mergeData);
};

module.exports = {
    updateDashboardMonthlySummaryOnStatusChange,
};
