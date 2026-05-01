const {
    RECEIPT_SCHEMA,
    SCHEMA_RECEIPT,
    PARTNER_SCHEMA,
    SCHEMA_SUPPLIER,
    tableName,
} = require("../../../config/dbSchema");
const { TABLES, COLS } = require("../constants");
const { normalizeMoney } = require("../../../../webhook/sepay/utils");
const {
    mergeSummaryUpdates,
    monthKeyFromPaidDateYmd,
} = require("./dashboardSummary");
const { resolveDashboardImportDeltaOnPaid } = require("./dashboardImportDeltaOnPaid");

const fetchSupplierNameBySupplyId = async (trx, supplyIdRaw) => {
    if (supplyIdRaw == null || !Number.isFinite(Number(supplyIdRaw))) return "";
    const t = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_SUPPLIER);
    const c = PARTNER_SCHEMA.SUPPLIER.COLS;
    const row = await trx(t)
        .where(c.ID, Number(supplyIdRaw))
        .select(c.SUPPLIER_NAME)
        .first();
    return String(row?.[c.SUPPLIER_NAME] ?? "").trim();
};

/**
 * Hoàn tác đúng phần đã ghi lên `dashboard_monthly_summary` khi biên lai được posted (webhook / manual),
 * theo `payment_receipt.payment_date` và `payment_receipt_financial_state.posted_*`.
 * Trả `true` nếu đã chạy `mergeSummaryUpdates` hoàn tác (có chênh lệch số học) — khi đó không dùng nhánh chỉnh doanh thu birth/refund cũ và không áp fallback (hoàn − NCC).
 */
const applyReversePostedReceiptDashboard = async (trx, orderRow) => {
    const prCols = RECEIPT_SCHEMA.PAYMENT_RECEIPT.COLS;
    const fsCols = RECEIPT_SCHEMA.PAYMENT_RECEIPT_FINANCIAL_STATE.COLS;
    const fsTable = tableName(
        RECEIPT_SCHEMA.PAYMENT_RECEIPT_FINANCIAL_STATE.TABLE,
        SCHEMA_RECEIPT
    );
    const idOrder = String(
        orderRow[COLS.ORDER.ID_ORDER] ?? orderRow.id_order ?? ""
    ).trim();
    if (!idOrder) return false;

    const rows = await trx(`${TABLES.paymentReceipt} as r`)
        .join(`${fsTable} as fs`, `r.${prCols.ID}`, `fs.${fsCols.PAYMENT_RECEIPT_ID}`)
        .where(`fs.${fsCols.IS_FINANCIAL_POSTED}`, true)
        .whereRaw(`LOWER(TRIM(r.${prCols.ORDER_CODE}::text)) = LOWER(TRIM(?::text))`, [
            idOrder,
        ])
        .select({
            paid_date: `r.${prCols.PAID_DATE}`,
            posted_revenue: `fs.${fsCols.POSTED_REVENUE}`,
            posted_profit: `fs.${fsCols.POSTED_PROFIT}`,
            posted_off_flow_bank_receipt: `fs.${fsCols.POSTED_OFF_FLOW_BANK_RECEIPT}`,
        });

    if (!rows.length) return false;

    const cost = normalizeMoney(orderRow[COLS.ORDER.COST]);
    const byMonth = new Map();

    for (const row of rows) {
        const mk = monthKeyFromPaidDateYmd(row.paid_date);
        if (!mk) continue;
        const rev = normalizeMoney(row.posted_revenue);
        const prof = normalizeMoney(row.posted_profit);
        const offFlow = normalizeMoney(row.posted_off_flow_bank_receipt);
        let imp = 0;
        if (cost > 0) {
            imp = await resolveDashboardImportDeltaOnPaid(
                trx,
                orderRow,
                cost,
                fetchSupplierNameBySupplyId,
                mk
            );
        }
        const cur = byMonth.get(mk) || {
            revenue: 0,
            profit: 0,
            orders: 0,
            import: 0,
            off_flow_bank_receipt: 0,
        };
        cur.revenue += rev;
        cur.profit += prof;
        cur.orders += 1;
        cur.import += imp;
        cur.off_flow_bank_receipt += offFlow;
        byMonth.set(mk, cur);
    }

    if (!byMonth.size) return false;

    let appliedReverseMerge = false;
    for (const [mk, a] of byMonth) {
        const updates = {};
        const rev = Number(a.revenue) || 0;
        const prof = Number(a.profit) || 0;
        const ord = Number(a.orders) || 0;
        const imp = Number(a.import) || 0;
        const offFlow = Number(a.off_flow_bank_receipt) || 0;
        if (rev !== 0) updates.total_revenue = -rev;
        if (prof !== 0) updates.total_profit = -prof;
        if (ord !== 0) updates.total_orders = -ord;
        if (imp !== 0) updates.total_import = -imp;
        if (offFlow !== 0) updates.total_off_flow_bank_receipt = -offFlow;
        if (Object.keys(updates).length) {
            await mergeSummaryUpdates(trx, mk, updates);
            appliedReverseMerge = true;
        }
    }

    return appliedReverseMerge;
};

module.exports = {
    applyReversePostedReceiptDashboard,
};
