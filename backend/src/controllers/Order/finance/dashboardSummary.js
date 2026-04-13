const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName, ORDERS_SCHEMA } = require("../../../config/dbSchema");
const { STATUS, TABLES, COLS } = require("../constants");
const { toNullableNumber } = require("../../../utils/normalizers");
const { quoteIdent } = require("../../../utils/sql");
const {
    isMavnImportOrder,
    isGiftOrder,
    isDashboardSalesOrder,
    isMavrykShopSupplierName,
} = require("../../../utils/orderHelpers");

const orderSupplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;

/**
 * MAVT / MAVN: trừ lợi nhuận bằng cost khi NCC không phải Mavryk/Shop (chủ shop).
 */
const externalSupplierCostHitForMavtOrMavn = async (trx, row) => {
    if (!isGiftOrder(row) && !isMavnImportOrder(row)) return 0;
    const cost = toNullableNumber(row?.cost ?? row?.[COLS.ORDER.COST]) || 0;
    if (cost <= 0) return 0;
    const supplyId = row?.[orderSupplyIdCol] ?? row?.supply_id ?? row?.id_supply;
    if (supplyId == null || supplyId === "") return cost;
    const sup = await trx(TABLES.supplier)
        .select(COLS.SUPPLIER.SUPPLIER_NAME)
        .where(COLS.SUPPLIER.ID, supplyId)
        .first();
    if (isMavrykShopSupplierName(sup?.[COLS.SUPPLIER.SUPPLIER_NAME])) return 0;
    return cost;
};

/** MAVC/L/K/S: NCC Mavryk/Shop → lợi nhuận = giá bán; NCC khác → giá bán - cost. */
const salesOrderProfitDeltaForDashboard = async (trx, row) => {
    if (!isDashboardSalesOrder(row)) return 0;
    const price = toNullableNumber(row?.price ?? row?.[COLS.ORDER.PRICE]) || 0;
    const cost = toNullableNumber(row?.cost ?? row?.[COLS.ORDER.COST]) || 0;
    const supplyId = row?.[orderSupplyIdCol] ?? row?.supply_id ?? row?.id_supply;
    if (supplyId == null || supplyId === "") return price - cost;
    const sup = await trx(TABLES.supplier)
        .select(COLS.SUPPLIER.SUPPLIER_NAME)
        .where(COLS.SUPPLIER.ID, supplyId)
        .first();
    if (isMavrykShopSupplierName(sup?.[COLS.SUPPLIER.SUPPLIER_NAME])) return price;
    return price - cost;
};

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

const hasMeaningfulDate = (value) =>
    value !== undefined &&
    value !== null &&
    String(value).trim() !== "" &&
    String(value).trim().toLowerCase() !== "null";

/**
 * Hoàn tiền / đếm hủy gắn với tháng của canceled_at (giống rebuild-dashboard-monthly-summary.js).
 * Doanh thu & đơn vẫn theo order_date.
 */
const monthKeyFromOrderRow = (beforeRow, afterRow) => {
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
};

const updateDashboardMonthlySummaryOnStatusChange = async(trx, beforeRow, afterRow) => {
    const prevStatus = beforeRow?.status || STATUS.UNPAID;
    const nextStatus = afterRow?.status || STATUS.UNPAID;

    if (prevStatus === nextStatus) return;

    const orderMonthKey = monthKeyFromOrderRow(beforeRow, afterRow);
    const refundMonthKey = monthKeyFromRefundRow(beforeRow, afterRow) || orderMonthKey;

    if (!orderMonthKey && !refundMonthKey) return;

    const revenueUpdates = {};
    const refundUpdates = {};

    // Order left the "counted" lifecycle → -1 order, -revenue, -profit (đơn thường)
    // MAVN nhập hàng: không vào doanh thu / đếm đơn; khi đã PAID đã trừ profit = cost → hủy hoàn lại +cost
    if (isOrderCounted(prevStatus) && !isOrderCounted(nextStatus)) {
        if (isMavnImportOrder(beforeRow)) {
            if (prevStatus !== STATUS.PROCESSING) {
                const addBack = await externalSupplierCostHitForMavtOrMavn(trx, beforeRow);
                revenueUpdates.total_profit = (revenueUpdates.total_profit || 0) + addBack;
            }
        } else if (isGiftOrder(beforeRow)) {
            const giftBack = await externalSupplierCostHitForMavtOrMavn(trx, beforeRow);
            const price = toNullableNumber(beforeRow?.price) || 0;
            revenueUpdates.total_revenue = (revenueUpdates.total_revenue || 0) - price;
            revenueUpdates.total_profit = (revenueUpdates.total_profit || 0) + giftBack;
        } else if (isDashboardSalesOrder(beforeRow)) {
            const price = toNullableNumber(beforeRow?.price) || 0;
            const profit = await salesOrderProfitDeltaForDashboard(trx, beforeRow);
            revenueUpdates.total_orders = (revenueUpdates.total_orders || 0) - 1;
            revenueUpdates.total_revenue = (revenueUpdates.total_revenue || 0) - price;
            revenueUpdates.total_profit = (revenueUpdates.total_profit || 0) - profit;
        }
    }

    // Order left refund lifecycle → -1 canceled, -refund
    if (isRefundCounted(prevStatus) && !isRefundCounted(nextStatus)) {
        const refund = toNullableNumber(beforeRow?.refund) || 0;
        refundUpdates.canceled_orders = (refundUpdates.canceled_orders || 0) - 1;
        refundUpdates.total_refund = (refundUpdates.total_refund || 0) - refund;
    }

    // Order entered the "counted" lifecycle ONLY via PROCESSING (UNPAID/CANCELLED → PROCESSING)
    if (
        !isOrderCounted(prevStatus) &&
        nextStatus === STATUS.PROCESSING &&
        !isMavnImportOrder(afterRow)
    ) {
        if (isGiftOrder(afterRow)) {
            const giftCost = await externalSupplierCostHitForMavtOrMavn(trx, afterRow);
            const price = toNullableNumber(afterRow?.price) || 0;
            revenueUpdates.total_revenue = (revenueUpdates.total_revenue || 0) + price;
            revenueUpdates.total_profit = (revenueUpdates.total_profit || 0) - giftCost;
        } else if (isDashboardSalesOrder(afterRow)) {
            const price = toNullableNumber(afterRow?.price) || 0;
            const profit = await salesOrderProfitDeltaForDashboard(trx, afterRow);
            revenueUpdates.total_orders = (revenueUpdates.total_orders || 0) + 1;
            revenueUpdates.total_revenue = (revenueUpdates.total_revenue || 0) + price;
            revenueUpdates.total_profit = (revenueUpdates.total_profit || 0) + profit;
        }
    }

    // MAVN nhập hàng: Đang xử lý hoặc Chưa TT → Đã thanh toán — trừ lợi nhuận bằng giá nhập (cost), không động doanh thu
    if (
        nextStatus === STATUS.PAID &&
        isMavnImportOrder(afterRow) &&
        (prevStatus === STATUS.PROCESSING || prevStatus === STATUS.UNPAID)
    ) {
        const deduct = await externalSupplierCostHitForMavtOrMavn(trx, afterRow);
        revenueUpdates.total_profit = (revenueUpdates.total_profit || 0) - deduct;
    }

    // Order entered refund lifecycle (e.g. PAID → PENDING_REFUND) → +1 canceled, +refund
    if (!isRefundCounted(prevStatus) && isRefundCounted(nextStatus)) {
        const refund = toNullableNumber(afterRow?.refund) || 0;
        refundUpdates.canceled_orders = (refundUpdates.canceled_orders || 0) + 1;
        refundUpdates.total_refund = (refundUpdates.total_refund || 0) + refund;
    }

    // MAVN nhập hàng: PAID/PROCESSING → CANCELED (không qua Chờ Hoàn) — vẫn ghi nhận hoàn theo cột refund
    if (
        !isRefundCounted(prevStatus) &&
        nextStatus === STATUS.CANCELED &&
        isMavnImportOrder(afterRow)
    ) {
        const refund = toNullableNumber(afterRow?.refund) || 0;
        if (refund > 0) {
            refundUpdates.canceled_orders = (refundUpdates.canceled_orders || 0) + 1;
            refundUpdates.total_refund = (refundUpdates.total_refund || 0) + refund;
        }
    }

    const revenueKey = orderMonthKey;
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
};
