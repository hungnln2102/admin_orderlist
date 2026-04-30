const deleteOrderWithArchive = async ({
    trx,
    order,
    normalized,
    helpers,
}) => {
    const { TABLES, ORDERS_SCHEMA, STATUS } = helpers;
    const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../config/dbSchema");
    const { isMavnImportOrder, isGiftOrder } = require("../../utils/orderHelpers");
    const { calcRemainingRefund } = require("./finance/refunds");
    const { updateDashboardMonthlySummaryOnStatusChange } = require("./finance/dashboardSummary");
    const { createOrGetRefundCreditNoteForOrder } = require("./finance/refundCredits");
    const { todayYMDInVietnam } = require("../../utils/normalizers");
    const orderId = order?.id;
    const statusCol = ORDERS_SCHEMA.ORDER_LIST.COLS.STATUS;
    const refundCol = ORDERS_SCHEMA.ORDER_LIST.COLS.REFUND;
    const canceledAtCol = ORDERS_SCHEMA.ORDER_LIST.COLS.CANCELED_AT;
    const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
    const buildRefundReferenceCode = (orderCodeRaw) => {
        const normalizedCode = String(orderCodeRaw || "").trim();
        return normalizedCode ? `RF ${normalizedCode}` : "RF";
    };
    const toPositiveAmount = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num) || num === 0) return 0;
        return Math.abs(Math.round(num));
    };

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
        const expenseTable = tableName(FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE, SCHEMA_FINANCE);
        const eCols = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;
        if (isMavnImportOrder(order) && eCols.LINKED_ORDER_CODE) {
            const code = String(order?.[idOrderCol] ?? "").trim();
            if (code) {
                await trx(expenseTable)
                    .where(eCols.EXPENSE_TYPE, "mavn_import")
                    .where(eCols.LINKED_ORDER_CODE, code)
                    .del();
            }
        }
        await trx(TABLES.orderList).where({ id: orderId }).del();
        await trx.commit();
        return { success: true, movedTo: "deleted", deletedOrder: normalized };
    }

    const shouldArchiveToCanceled =
        normalizedStatus === STATUS.PAID ||
        normalizedStatus === STATUS.PROCESSING;
    let movedTo = shouldArchiveToCanceled ? "canceled" : "expired";

    if (shouldArchiveToCanceled) {
        const isGift = isGiftOrder(order);
        let refundValue = 0;
        if (isGift) {
            // MAVT: giá trị hoàn ghi trên đơn = 0 (NCC tính riêng theo cost / ngày còn lại).
            refundValue = 0;
        } else {
            // Cột `refund` = giá trị còn lại theo doanh thu (giá bán prorata), cùng calcRemainingRefund ở UI.
            const customerRefund = Number(calcRemainingRefund(order, normalized)) || 0;
            refundValue = toPositiveAmount(Math.max(0, customerRefund));
        }

        // Rule mới: xóa đơn luôn vào Chưa Hoàn để theo dõi log NCC và xác nhận hoàn theo từng bước.
        const archiveStatus = STATUS.PENDING_REFUND;
        movedTo = "canceled";
        const orderCode = order?.[idOrderCol] ?? order?.id_order;

        // canceled_at: chỉ ghi một lần lúc chuyển sang Chưa Hoàn / Hủy (ngày VN, YYYY-MM-DD).
        const existingCanceledRaw = order?.[canceledAtCol] ?? order?.canceled_at;
        const hasCanceledAt =
            existingCanceledRaw !== undefined &&
            existingCanceledRaw !== null &&
            String(existingCanceledRaw).trim() !== "" &&
            String(existingCanceledRaw).trim().toLowerCase() !== "null";

        // Không ghi đè information_order (email/tài khoản…) — chỉ trạng thái, refund, ngày hủy.
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
