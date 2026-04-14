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
    const { calcRemainingImport } = require("./finance/refunds");
    const { updateDashboardMonthlySummaryOnStatusChange } = require("./finance/dashboardSummary");
    const { toNullableNumber, todayYMDInVietnam } = require("../../utils/normalizers");
    const { isMavnImportOrder, isGiftOrder } = require("../../utils/orderHelpers");
    const logger = require("../../utils/logger");

    const orderId = order?.id;
    const statusCol = ORDERS_SCHEMA.ORDER_LIST.COLS.STATUS;
    const refundCol = ORDERS_SCHEMA.ORDER_LIST.COLS.REFUND;
    const canceledAtCol = ORDERS_SCHEMA.ORDER_LIST.COLS.CANCELED_AT;
    const toNegativeAmount = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num) || num === 0) return 0;
        return -Math.abs(Math.round(num));
    };

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
    let movedTo = shouldArchiveToCanceled ? "canceled" : "expired";

    if (shouldArchiveToCanceled) {
        const isMavn = isMavnImportOrder(order);
        const isGift = isGiftOrder(order);
        const bodyRefund =
            toNullableNumber(reqBody?.can_hoan) ??
            toNullableNumber(reqBody?.gia_tri_con_lai);

        let refundValue = 0;
        if (isMavn) {
            const importRefund =
                bodyRefund !== null && bodyRefund !== undefined
                    ? Math.max(0, bodyRefund)
                    : (calcRemainingImport(order, normalized) ?? calcRemainingRefund(order, normalized));
            refundValue = toNegativeAmount(importRefund);
        } else if (isGift) {
            // MAVT: giá trị hoàn trên đơn luôn 0 (log NCC được trigger tính riêng theo cost/ngày còn lại).
            refundValue = 0;
        } else {
            const computedRefund =
                bodyRefund !== null && bodyRefund !== undefined
                    ? Math.max(0, bodyRefund)
                    : (calcRemainingImport(order, normalized) ?? calcRemainingRefund(order, normalized));
            refundValue = toNegativeAmount(computedRefund);
        }

        const archiveStatus = (isMavn || isGift) ? STATUS.REFUNDED : STATUS.PENDING_REFUND;
        movedTo = archiveStatus === STATUS.REFUNDED ? "refunded" : "canceled";

        // canceled_at: chỉ ghi một lần lúc chuyển sang Chờ Hoàn / Hủy (ngày VN, YYYY-MM-DD).
        const existingCanceledRaw = order?.[canceledAtCol] ?? order?.canceled_at;
        const hasCanceledAt =
            existingCanceledRaw !== undefined &&
            existingCanceledRaw !== null &&
            String(existingCanceledRaw).trim() !== "" &&
            String(existingCanceledRaw).trim().toLowerCase() !== "null";

        const updatePayload = {
            [statusCol]: archiveStatus,
            [refundCol]: refundValue,
        };
        if (!hasCanceledAt) {
            updatePayload[canceledAtCol] = todayYMDInVietnam();
        }

        await trx(TABLES.orderList).where({ id: orderId }).update(updatePayload);

        const afterOrder = {
            ...order,
            [statusCol]: archiveStatus,
            [refundCol]: refundValue,
        };
        if (updatePayload[canceledAtCol] !== undefined) {
            afterOrder[canceledAtCol] = updatePayload[canceledAtCol];
        }
        await updateDashboardMonthlySummaryOnStatusChange(trx, order, afterOrder);
    } else {
        await trx(TABLES.orderList).where({ id: orderId }).update({
            [statusCol]: STATUS.EXPIRED,
        });
    }

    await trx.commit();
    return { success: true, movedTo, deletedOrder: normalized };
};

module.exports = {
    deleteOrderWithArchive,
};
