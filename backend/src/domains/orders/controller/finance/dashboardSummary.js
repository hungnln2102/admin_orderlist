const {
    FINANCE_SCHEMA,
    SCHEMA_FINANCE,
    tableName,
} = require("../../../../config/dbSchema");
const { STATUS, COLS } = require("../constants");
const { toNullableNumber, todayYMDInVietnam } = require("../../../../utils/normalizers");
const { quoteIdent } = require("../../../../utils/sql");
const {
    isDashboardSalesOrder,
} = require("../../../../utils/orderHelpers");
const { dashboardMonthlyTaxRatePercent } = require("../../../../config/appConfig");
const { addDailyRevenueReversed } = require("./dailyRevenueSummaryAdjustments");
const { notifyFinanceMonthlyDelta } = require("../../../../services/telegramFinanceDeltaNotifier");

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

// Statuses that count the order as a refund
const REFUND_COUNTED_STATUSES = [STATUS.PENDING_REFUND, STATUS.REFUNDED];

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

/** `YYYY-MM` từ ngày lịch VN — không parse qua `Date` (tránh lệch múi server). */
const monthKeyFromVietnamYmd = (ymd) => {
    const s = String(ymd ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(0, 7) : null;
};

/** Tháng lịch VN tại thời điểm gọi (khớp createOrder đã TT / webhook). */
const monthKeyVietnamNow = () => monthKeyFromVietnamYmd(todayYMDInVietnam());

const monthKeyCurrentVietnam = () => monthKeyVietnamNow();

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

const mergeSummaryUpdates = async (
    trx,
    monthKey,
    updates,
    {
        notify = true,
        context = "dashboardSummary.mergeSummaryUpdates",
    } = {}
) => {
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

    if (updates.estimated_bank_balance !== undefined) {
        insertData[summaryCols.ESTIMATED_BANK_BALANCE] = updates.estimated_bank_balance;
        mergeData[summaryCols.ESTIMATED_BANK_BALANCE] = trx.raw(
            `${qualifiedSummaryCol(summaryCols.ESTIMATED_BANK_BALANCE)} + ${updates.estimated_bank_balance}`
        );
    }

    await trx(summaryTable)
        .insert(insertData)
        .onConflict(summaryCols.MONTH_KEY)
        .merge(mergeData);

    await recomputeSummaryMonthTotalTax(trx, monthKey);
    if (!notify) return;
    await notifyFinanceMonthlyDelta({
        monthKey,
        revenueDelta: updates.total_revenue || 0,
        profitDelta: updates.total_profit || 0,
        importDelta: updates.total_import || 0,
        refundDelta: updates.total_refund || 0,
        offFlowDelta: updates.total_off_flow_bank_receipt || 0,
        bankBalanceDelta: updates.estimated_bank_balance || 0,
        context,
        executor: trx,
    });
};

/**
 * Tháng `YYYY-MM` theo `created_at` (Asia/Ho_Chi_Minh), dùng khi đồng bộ chi phí nhập ngoài luồng → `total_profit`.
 */
const monthKeyVietnamFromDbTimestamp = async (trx, createdAt) => {
    const r = await trx.raw(
        `SELECT TO_CHAR(
            DATE_TRUNC(
                'month',
                timezone('Asia/Ho_Chi_Minh', COALESCE(?::timestamptz, NOW()))
            ),
            'YYYY-MM'
        ) AS mk`,
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
 * Điều chỉnh số dư bank ước tính theo tháng.
 * Dương = tiền vào bank, âm = tiền ra bank.
 */
const applyEstimatedBankBalanceDelta = async (
    trx,
    monthKey,
    bankBalanceDelta,
    options = undefined
) => {
    const d = Number(bankBalanceDelta);
    if (!monthKey || !Number.isFinite(d) || d === 0) return;
    await mergeSummaryUpdates(trx, monthKey, { estimated_bank_balance: d }, options);
};

/**
 * Cập nhật `dashboard_monthly_summary` khi đổi trạng thái đơn:
 * - Vào luồng hoàn (Đã TT → Chưa Hoàn / Đã Hoàn): ghi delta ngay tháng hiện tại (Model A).
 * - `total_refund` là chỉ số tracking; doanh thu tháng đã bị trừ trực tiếp theo delta refund.
 *
 * **`total_import` (theo NCC):** `partner.fn_recalc_dashboard_total_import` sau khi `supplier_order_cost_log` thay đổi
 * (migration import-only). Webhook/manual khi Đã TT: `importDelta` chỉ khi **không** có log NCC trong
 * **tháng** `paidMonthKey` và NCC tên `mavryk` (khớp SQL); còn lại tổng ledger. **`total_profit`:** webhook Sepay / manual webhook
 * (chuyển Đã TT), chi phí MAVN (`syncMavnStoreProfitExpense`), `external_import`, v.v.
 */
const updateDashboardMonthlySummaryOnStatusChange = async (
    trx,
    beforeRow,
    afterRow,
    _options = {}
) => {
    /**
     * Bank shop chỉ thay đổi khi admin bấm "Đã Hoàn" trên phiếu credit (refundCreditRoutes
     * action=complete) — lúc đó chọn STK rồi trừ STK đúng số tiền.
     * Đường này (vào/rời lifecycle hoàn) chỉ ghi báo cáo doanh thu/refund/canceled_orders,
     * KHÔNG đụng số dư bank để tránh trừ hai lần.
     */
    const prevStatus = beforeRow?.status || STATUS.UNPAID;
    const nextStatus = afterRow?.status || STATUS.UNPAID;

    if (prevStatus === nextStatus) return;

    const birthMonthKey = monthKeyFromBirthRow(beforeRow, afterRow);
    const refundMonthKey = monthKeyCurrentVietnam() || birthMonthKey;

    if (!birthMonthKey && !refundMonthKey) return;

    const refundUpdates = {};

    if (isDashboardSalesOrder(beforeRow) && isRefundCounted(prevStatus) && !isRefundCounted(nextStatus)) {
        const refund = toNullableNumber(beforeRow?.refund) || 0;
        refundUpdates.canceled_orders = (refundUpdates.canceled_orders || 0) - 1;
        refundUpdates.total_refund = (refundUpdates.total_refund || 0) - refund;
    }

    if (isDashboardSalesOrder(afterRow) && prevStatus === STATUS.PAID && isRefundCounted(nextStatus)) {
        const refund = toNullableNumber(afterRow?.refund) || 0;
        refundUpdates.canceled_orders = (refundUpdates.canceled_orders || 0) + 1;
        refundUpdates.total_refund = (refundUpdates.total_refund || 0) + refund;
        refundUpdates.total_revenue = (refundUpdates.total_revenue || 0) - refund;
    }

    if (Object.keys(refundUpdates).length > 0 && refundMonthKey) {
        await mergeSummaryUpdates(trx, refundMonthKey, refundUpdates, { notify: false });
    }

    let refundProfitDelta = 0;

    if (
        isDashboardSalesOrder(afterRow) &&
        prevStatus === STATUS.PAID &&
        isRefundCounted(nextStatus) &&
        refundMonthKey
    ) {
        const { applyPendingRefundProfitMinusCustomerOverNcc } = require("./pendingRefundDashboardProfitFallback");
        refundProfitDelta = await applyPendingRefundProfitMinusCustomerOverNcc(
            trx,
            beforeRow,
            afterRow,
            refundMonthKey,
            { notify: false }
        );

        const refund = toNullableNumber(afterRow?.[COLS.ORDER.REFUND] ?? afterRow?.refund) || 0;
        if (refund > 0) {
            await addDailyRevenueReversed(trx, {
                summaryDate: afterRow?.canceled_at || todayYMDInVietnam(),
                amount: refund,
            });
        }
    }

    if (!refundMonthKey) return;
    const notifyRevenueDelta = Number(refundUpdates.total_revenue || 0);
    const notifyRefundDelta = Number(refundUpdates.total_refund || 0);
    const notifyProfitDelta = Number(refundProfitDelta || 0);
    if (
        notifyRevenueDelta !== 0 ||
        notifyRefundDelta !== 0 ||
        notifyProfitDelta !== 0
    ) {
        await notifyFinanceMonthlyDelta({
            monthKey: refundMonthKey,
            revenueDelta: notifyRevenueDelta,
            profitDelta: notifyProfitDelta,
            importDelta: 0,
            refundDelta: notifyRefundDelta,
            offFlowDelta: 0,
            bankBalanceDelta: 0,
            context: "dashboardSummary.refund.statusChange",
            executor: trx,
        });
    }
};

module.exports = {
    updateDashboardMonthlySummaryOnStatusChange,
    mergeSummaryUpdates,
    qualifiedSummaryCol,
    recomputeSummaryMonthTotalTax,
    monthKeyFromPaidDateYmd,
    monthKeyFromVietnamYmd,
    monthKeyVietnamNow,
    monthKeyVietnamFromDbTimestamp,
    applyExternalImportProfitDelta,
    applyEstimatedBankBalanceDelta,
};
