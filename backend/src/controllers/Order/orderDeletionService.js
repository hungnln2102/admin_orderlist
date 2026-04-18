const deleteOrderWithArchive = async ({
    trx,
    order,
    normalized,
    helpers,
}) => {
    const { TABLES, ORDERS_SCHEMA, STATUS } = helpers;
    const { adjustSupplierDebtIfNeeded } = require("./orderFinanceHelpers");
    const { calcRemainingImport } = require("./finance/refunds");
    const { updateDashboardMonthlySummaryOnStatusChange } = require("./finance/dashboardSummary");
    const { createOrGetRefundCreditNoteForOrder } = require("./finance/refundCredits");
    const { toNullableNumber, todayYMDInVietnam } = require("../../utils/normalizers");
    const { isMavnImportOrder, isGiftOrder } = require("../../utils/orderHelpers");
    const logger = require("../../utils/logger");

    const orderId = order?.id;
    const statusCol = ORDERS_SCHEMA.ORDER_LIST.COLS.STATUS;
    const refundCol = ORDERS_SCHEMA.ORDER_LIST.COLS.REFUND;
    const canceledAtCol = ORDERS_SCHEMA.ORDER_LIST.COLS.CANCELED_AT;
    const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
    const informationOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.INFORMATION_ORDER;
    const buildRefundReferenceCode = (orderCodeRaw) => {
        const normalizedCode = String(orderCodeRaw || "").trim();
        return normalizedCode ? `RF ${normalizedCode}` : "RF";
    };
    const toPositiveAmount = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num) || num === 0) return 0;
        return Math.abs(Math.round(num));
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
        let refundValue = 0;
        if (isMavn) {
            const importRefund = calcRemainingImport(order, normalized);
            const fallbackCost = toNullableNumber(order?.cost) || 0;
            refundValue = toPositiveAmount(
                Math.max(0, importRefund != null ? Number(importRefund) : fallbackCost)
            );
        } else if (isGift) {
            // MAVT: giá trị hoàn trên đơn luôn 0 (log NCC được trigger tính riêng theo cost/ngày còn lại).
            refundValue = 0;
        } else {
            const importRefund = calcRemainingImport(order, normalized);
            const fallbackCost = toNullableNumber(order?.cost) || 0;
            refundValue = toPositiveAmount(
                Math.max(0, importRefund != null ? Number(importRefund) : fallbackCost)
            );
        }

        // Rule mới: xóa đơn luôn vào Chưa Hoàn để theo dõi log NCC và xác nhận hoàn theo từng bước.
        const archiveStatus = STATUS.PENDING_REFUND;
        movedTo = "canceled";
        const orderCode = order?.[idOrderCol] ?? order?.id_order;
        const refundReferenceCode = buildRefundReferenceCode(orderCode);

        // canceled_at: chỉ ghi một lần lúc chuyển sang Chưa Hoàn / Hủy (ngày VN, YYYY-MM-DD).
        const existingCanceledRaw = order?.[canceledAtCol] ?? order?.canceled_at;
        const hasCanceledAt =
            existingCanceledRaw !== undefined &&
            existingCanceledRaw !== null &&
            String(existingCanceledRaw).trim() !== "" &&
            String(existingCanceledRaw).trim().toLowerCase() !== "null";

        const updatePayload = {
            [statusCol]: archiveStatus,
            [refundCol]: refundValue,
            [informationOrderCol]: refundReferenceCode,
        };
        if (!hasCanceledAt) {
            updatePayload[canceledAtCol] = todayYMDInVietnam();
        }

        await trx(TABLES.orderList).where({ id: orderId }).update(updatePayload);

        const afterOrder = {
            ...order,
            [statusCol]: archiveStatus,
            [refundCol]: refundValue,
            [informationOrderCol]: refundReferenceCode,
        };
        if (updatePayload[canceledAtCol] !== undefined) {
            afterOrder[canceledAtCol] = updatePayload[canceledAtCol];
        }
        await updateDashboardMonthlySummaryOnStatusChange(trx, order, afterOrder);

        if (archiveStatus === STATUS.PENDING_REFUND && refundValue > 0) {
            await createOrGetRefundCreditNoteForOrder(trx, {
                sourceOrderListId: orderId,
                sourceOrderCode: orderCode,
                customerName: order?.customer,
                customerContact: order?.contact,
                refundAmount: refundValue,
                note: `Tạo tự động khi đơn chuyển ${STATUS.PENDING_REFUND}`,
            });
        }
    } else {
        await trx(TABLES.orderList).where({ id: orderId }).update({
            [statusCol]: STATUS.EXPIRED,
        });
    }

    await trx.commit();
    const deletedOrderCode = order?.[idOrderCol] ?? order?.id_order;
    return {
        success: true,
        movedTo,
        deletedOrder: normalized,
        refundReferenceCode: buildRefundReferenceCode(deletedOrderCode),
    };
};

module.exports = {
    deleteOrderWithArchive,
};
