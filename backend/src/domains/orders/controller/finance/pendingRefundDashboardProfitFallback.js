const {
    PARTNER_SCHEMA,
    SCHEMA_PARTNER,
    tableName,
} = require("../../../../config/dbSchema");
const { mergeSummaryUpdates } = require("./dashboardSummary");
const { COLS } = require("../constants");
const { toNullableNumber } = require("../../../../utils/normalizers");

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
 * Profit delta khi đơn chuyển hoàn theo công thức:
 *   profit_delta_refund = -(refund_amount - ncc_refund_amount)
 *                       = ncc_refund_amount - refund_amount
 */
const applyPendingRefundProfitMinusCustomerOverNcc = async (
    trx,
    beforeRow,
    afterRow,
    refundMonthKey,
    options = undefined
) => {
    const customerRef =
        toNullableNumber(
            afterRow?.[COLS.ORDER.REFUND] ?? afterRow?.refund
        ) || 0;
    if (!refundMonthKey || customerRef <= 0) return 0;

    const orderId = beforeRow?.[COLS.ORDER.ID] ?? beforeRow?.id;
    const nccSum = await sumNccRefundAmountForOrder(trx, orderId);
    const profitDeltaRefund = Number(nccSum) - Number(customerRef);
    if (!Number.isFinite(profitDeltaRefund) || profitDeltaRefund === 0) return 0;
    await mergeSummaryUpdates(trx, refundMonthKey, { total_profit: profitDeltaRefund }, options);
    return profitDeltaRefund;
};

module.exports = {
    applyPendingRefundProfitMinusCustomerOverNcc,
    sumNccRefundAmountForOrder,
};
