const {
    FINANCE_SCHEMA,
    SCHEMA_FINANCE,
    tableName,
} = require("../../../config/dbSchema");
const { STATUS, COLS } = require("../constants");
const { toNullableNumber } = require("../../../utils/normalizers");
const { quoteIdent } = require("../../../utils/sql");
const {
    isDashboardSalesOrder,
} = require("../../../utils/orderHelpers");
const { dashboardMonthlyTaxRatePercent } = require("../../../config/appConfig");

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

/** `month_key` từ `paid_date` biên lai: DATE / timestamptz / `YYYY-MM-DD` — dùng UTC cho `Date` để khớp `date` PG. */
const monthKeyFromPaidDateYmd = (ymd) => {
    if (ymd instanceof Date && !isNaN(ymd.getTime())) {
        const y = ymd.getUTCFullYear();
        const m = String(ymd.getUTCMonth() + 1).padStart(2, "0");
        return `${y}-${m}`;
    }
    const s = String(ymd ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 7);
    if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(s)) return s.slice(0, 7);
    return null;
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

    if (updates.total_import !== undefined) {
        mergeData[summaryCols.TOTAL_IMPORT] = trx.raw(
            `GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_IMPORT)} + ${updates.total_import})`
        );
    }

    if (updates.total_off_flow_bank_receipt !== undefined) {
        mergeData[summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT] = trx.raw(
            `${qualifiedSummaryCol(summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT)} + ${updates.total_off_flow_bank_receipt}`
        );
    }

    await trx(summaryTable)
        .insert(insertData)
        .onConflict(summaryCols.MONTH_KEY)
        .merge(mergeData);

    await recomputeSummaryMonthTotalTax(trx, monthKey);
};

/**
 * Tháng `YYYY-MM` theo `created_at` (Asia/Ho_Chi_Minh), dùng khi đồng bộ chi phí nhập ngoài luồng → `total_profit`.
 */
const monthKeyVietnamFromDbTimestamp = async (trx, createdAt) => {
    const r = await trx.raw(
        `SELECT TO_CHAR(DATE_TRUNC('month', COALESCE(?::timestamptz, NOW()) AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM') AS mk`,
        [createdAt ?? null]
    );
    const mk = String(r.rows?.[0]?.mk || "").trim();
    return mk || null;
};

/**
 * Điều chỉnh `total_profit` trên tổng hợp tháng khi ghi nhận / hoàn tác `external_import` (nhập ngoài luồng).
 * `profitDelta` âm = giảm lợi nhuận (thêm cost); dương = hoàn tác.
 */
const applyExternalImportProfitDelta = async (trx, monthKey, profitDelta) => {
    const d = Number(profitDelta);
    if (!monthKey || !Number.isFinite(d) || d === 0) return;
    await mergeSummaryUpdates(trx, monthKey, { total_profit: d });
};

/**
 * Cập nhật `dashboard_monthly_summary` khi đổi trạng thái đơn: **đếm hoàn / canceled** và **doanh thu**
 * khi vào luồng hoàn (Đã TT → Chưa Hoàn / Đã Hoàn), prorata `total_revenue` theo refund.
 *
 * **`total_import` (theo NCC):** `partner.fn_recalc_dashboard_total_import` sau khi `supplier_order_cost_log` thay đổi
 * (migration import-only). Webhook/manual khi Đã TT: `importDelta` chỉ khi **không** có log NCC trong
 * **tháng** `paidMonthKey` và NCC tên `mavryk` (khớp SQL); còn lại tổng ledger. **`total_profit`:** webhook Sepay / manual webhook
 * (chuyển Đã TT), chi phí MAVN (`syncMavnStoreProfitExpense`), `external_import`, v.v.
 * Khi thoát Đã TT vào luồng hoàn: hoàn tác theo `payment_receipt_financial_state` (xem `reversePostedReceiptFinancialDashboard.js`).
 */
const updateDashboardMonthlySummaryOnStatusChange = async(trx, beforeRow, afterRow) => {
    const prevStatus = beforeRow?.status || STATUS.UNPAID;
    const nextStatus = afterRow?.status || STATUS.UNPAID;

    if (prevStatus === nextStatus) return;

    const birthMonthKey = monthKeyFromBirthRow(beforeRow, afterRow);
    const refundMonthKey = monthKeyFromRefundRow(beforeRow, afterRow) || birthMonthKey;

    if (!birthMonthKey && !refundMonthKey) return;

    const refundUpdates = {};

    let reversedPostedReceiptFinancial = false;
    if (
        isDashboardSalesOrder(beforeRow) &&
        prevStatus === STATUS.PAID &&
        isRefundCounted(nextStatus)
    ) {
        const { applyReversePostedReceiptDashboard } = require("./reversePostedReceiptFinancialDashboard");
        reversedPostedReceiptFinancial = await applyReversePostedReceiptDashboard(trx, beforeRow);
    }

    // Order left refund lifecycle → -1 canceled, -refund (chỉ MAVC/MAVL/MAVK/MAVS)
    if (isDashboardSalesOrder(beforeRow) && isRefundCounted(prevStatus) && !isRefundCounted(nextStatus)) {
        const refund = toNullableNumber(beforeRow?.refund) || 0;
        refundUpdates.canceled_orders = (refundUpdates.canceled_orders || 0) - 1;
        refundUpdates.total_refund = (refundUpdates.total_refund || 0) - refund;
    }

    // Vào hoàn: trừ ghi nhận giá đầy đủ ở tháng birth, cộng lại (price−refund) ở tháng canceled_at (khớp aggregate).
    if (isDashboardSalesOrder(afterRow) && prevStatus === STATUS.PAID && isRefundCounted(nextStatus)) {
        const refund = toNullableNumber(afterRow?.refund) || 0;
        refundUpdates.canceled_orders = (refundUpdates.canceled_orders || 0) + 1;
        refundUpdates.total_refund = (refundUpdates.total_refund || 0) + refund;

        if (isOrderCounted(prevStatus) && !reversedPostedReceiptFinancial) {
            const base = beforeRow || afterRow;
            const price = toNullableNumber(base?.price ?? base?.[COLS.ORDER.PRICE]) || 0;
            const remain = Math.max(0, price - refund);
            if (birthMonthKey) {
                await mergeSummaryUpdates(trx, birthMonthKey, {
                    total_revenue: -price,
                });
            }
            if (refundMonthKey) {
                await mergeSummaryUpdates(trx, refundMonthKey, {
                    total_revenue: remain,
                });
            }
        }
    }

    if (Object.keys(refundUpdates).length > 0 && refundMonthKey) {
        await mergeSummaryUpdates(trx, refundMonthKey, refundUpdates);
    }

    if (
        isDashboardSalesOrder(afterRow) &&
        prevStatus === STATUS.PAID &&
        isRefundCounted(nextStatus) &&
        !reversedPostedReceiptFinancial &&
        refundMonthKey
    ) {
        const { applyPendingRefundProfitMinusCustomerOverNcc } = require("./pendingRefundDashboardProfitFallback");
        await applyPendingRefundProfitMinusCustomerOverNcc(trx, beforeRow, afterRow, refundMonthKey);
    }
};

module.exports = {
    updateDashboardMonthlySummaryOnStatusChange,
    mergeSummaryUpdates,
    qualifiedSummaryCol,
    recomputeSummaryMonthTotalTax,
    monthKeyFromPaidDateYmd,
    monthKeyVietnamFromDbTimestamp,
    applyExternalImportProfitDelta,
};
