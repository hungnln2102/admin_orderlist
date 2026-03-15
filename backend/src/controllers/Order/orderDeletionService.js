const deleteOrderWithArchive = async ({
    trx,
    order,
    normalized,
    reqBody,
    helpers,
}) => {
    const { TABLES, ORDERS_SCHEMA, STATUS } = helpers;
    const {
        adjustSupplierDebtIfNeeded,
        calcRemainingRefund,
    } = require("./orderFinanceHelpers");
    const { toNullableNumber } = require("../../utils/normalizers");
    const logger = require("../../utils/logger");

    const orderId = order?.id;
    const statusCol = ORDERS_SCHEMA.ORDER_LIST.COLS.STATUS;
    const refundCol = ORDERS_SCHEMA.ORDER_LIST.COLS.REFUND;
    const canceledAtCol = ORDERS_SCHEMA.ORDER_LIST.COLS.CANCELED_AT;

    try {
        await adjustSupplierDebtIfNeeded(trx, order, normalized);
    } catch (debtErr) {
        const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
        logger.warn("Lỗi khi trừ/cộng công nợ NCC", {
            id: orderId,
            supply_id: order?.[supplyIdCol],
            cost: order?.cost,
            status: order?.status,
            error: debtErr?.message || String(debtErr),
            stack: debtErr?.stack,
        });
    }

    const normalizedStatus = String(
        normalized?.status ||
        normalized?.status_auto ||
        order?.status ||
        ""
    ).trim();
    const isHardDelete =
        normalizedStatus === STATUS.UNPAID ||
        normalizedStatus === STATUS.EXPIRED;

    if (isHardDelete) {
        await trx(TABLES.orderList).where({ id: orderId }).del();
        await trx.commit();
        return { success: true, movedTo: "deleted", deletedOrder: normalized };
    }

    const shouldArchiveToCanceled =
        normalizedStatus === STATUS.PAID ||
        normalizedStatus === STATUS.PROCESSING;

    if (shouldArchiveToCanceled) {
        const bodyRefund =
            toNullableNumber(reqBody?.can_hoan) ??
            toNullableNumber(reqBody?.gia_tri_con_lai);
        const refundValue = bodyRefund !== null && bodyRefund !== undefined
            ? Math.max(0, bodyRefund)
            : calcRemainingRefund(order, normalized);
        await trx(TABLES.orderList).where({ id: orderId }).update({
            [statusCol]: STATUS.PENDING_REFUND,
            [refundCol]: refundValue,
            [canceledAtCol]: new Date(),
        });
    } else {
        await trx(TABLES.orderList).where({ id: orderId }).update({
            [statusCol]: STATUS.EXPIRED,
        });
    }

    await trx.commit();
    return { success: true, movedTo: shouldArchiveToCanceled ? "canceled" : "expired", deletedOrder: normalized };
};

module.exports = {
    deleteOrderWithArchive,
};
