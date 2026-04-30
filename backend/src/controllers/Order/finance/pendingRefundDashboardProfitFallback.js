const {
    PARTNER_SCHEMA,
    SCHEMA_PARTNER,
    tableName,
} = require("../../../config/dbSchema");
const { mergeSummaryUpdates } = require("./dashboardSummary");
const { COLS } = require("../constants");
const { toNullableNumber } = require("../../../utils/normalizers");

const sumNccRefundAmountForOrder = async (trx, orderListId) => {
    const id = Number(orderListId);
    if (!Number.isFinite(id) || id <= 0) return 0;
    const t = tableName(PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE, SCHEMA_PARTNER);
    const c = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;
    const row = await trx(t)
        .where(c.ORDER_LIST_ID, id)
        .sum(`${c.REFUND_AMOUNT} as s`)
        .first();
    return toNullableNumber(row?.s) || 0;
};

/**
 * Khi đơn Đã TT → Chưa hoàn mà **không** hoàn tác được qua `payment_receipt_financial_state`
 * (legacy / thiếu posted): trừ `total_profit` tháng hoàn theo LN phải gánh: hoàn khách − tổng hoàn NCC trên log.
 */
const applyPendingRefundProfitMinusCustomerOverNcc = async (
    trx,
    beforeRow,
    afterRow,
    refundMonthKey
) => {
    const customerRef =
        toNullableNumber(
            afterRow?.[COLS.ORDER.REFUND] ?? afterRow?.refund
        ) || 0;
    if (!refundMonthKey || customerRef <= 0) return;

    const orderId = beforeRow?.[COLS.ORDER.ID] ?? beforeRow?.id;
    const nccSum = await sumNccRefundAmountForOrder(trx, orderId);
    const delta = Math.max(0, customerRef - nccSum);
    if (delta <= 0) return;

    await mergeSummaryUpdates(trx, refundMonthKey, { total_profit: -delta });
};

module.exports = {
    applyPendingRefundProfitMinusCustomerOverNcc,
    sumNccRefundAmountForOrder,
};
