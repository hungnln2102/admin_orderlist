const deleteOrderWithArchive = async ({
    trx,
    order,
    normalized,
    reqBody,
    helpers,
}) => {
    const {
        TABLES,
        ORDERS_SCHEMA,
        STATUS,
        nextId,
        pruneArchiveData,
        allowedArchiveColsExpired,
        allowedArchiveColsCanceled,
    } = helpers;
    const {
        adjustSupplierDebtIfNeeded,
        calcRemainingRefund,
    } = require("./orderFinanceHelpers");
    const { toNullableNumber } = require("../../utils/normalizers");
    const logger = require("../../utils/logger");

    const orderId = order?.id;

    // Thứ tự: (1) so_ngay_con_lai đã được tính ở crudRoutes qua normalizeOrderRow(expiry - today).
    // (2) Tính tiền NCC prorated theo so_ngay_con_lai rồi trừ vào NCC.
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
    const isHardDelete = normalizedStatus === STATUS.UNPAID;

    if (isHardDelete) {
        await trx(TABLES.orderList).where({ id: orderId }).del();
        await trx.commit();
        return { success: true, movedTo: "deleted", deletedOrder: normalized };
    }

    // Only paid/processing orders are treated as canceled; everything else is archived as expired.
    const shouldArchiveToCanceled =
        normalizedStatus === STATUS.PAID ||
        normalizedStatus === STATUS.PROCESSING;

    const targetTable = shouldArchiveToCanceled ? TABLES.orderCanceled : TABLES.orderExpired;

    const archiveData = { ...order };
    const archiveIdCol = shouldArchiveToCanceled
        ? ORDERS_SCHEMA.ORDER_CANCELED.COLS.ID
        : ORDERS_SCHEMA.ORDER_EXPIRED.COLS.ID;
    // Always use a fresh archive id to avoid PK collisions with existing archived rows.
    archiveData[archiveIdCol] = await nextId(targetTable, archiveIdCol, trx);

    if (shouldArchiveToCanceled) {
        // Cột days trong order_canceled = số ngày còn lại tại thời điểm hủy (note)
        const soNgayConLai = normalized?.so_ngay_con_lai;
        archiveData[ORDERS_SCHEMA.ORDER_CANCELED.COLS.DAYS] =
            soNgayConLai != null && Number.isFinite(Number(soNgayConLai))
                ? Number(soNgayConLai)
                : null;
        // Prefer an explicit refund from request body (UI sends giá trị còn lại),
        // otherwise fall back to prorated calculation.
        const bodyRefund =
            toNullableNumber(reqBody?.can_hoan) ??
            toNullableNumber(reqBody?.gia_tri_con_lai);
        const refundValue = bodyRefund !== null && bodyRefund !== undefined
            ? Math.max(0, bodyRefund)
            : calcRemainingRefund(order, normalized);
        archiveData[ORDERS_SCHEMA.ORDER_CANCELED.COLS.REFUND] = refundValue;
        archiveData.status = STATUS.PENDING_REFUND;
        archiveData[ORDERS_SCHEMA.ORDER_CANCELED.COLS.CREATED_AT] = new Date();
    } else {
        archiveData[ORDERS_SCHEMA.ORDER_EXPIRED.COLS.ARCHIVED_AT] = new Date();
        // Khi chuyển sang bảng hết hạn, luôn đặt trạng thái về "Hết Hạn"
        archiveData.status = STATUS.EXPIRED;
    }

    const allowedArchiveCols = shouldArchiveToCanceled
        ? allowedArchiveColsCanceled
        : allowedArchiveColsExpired;
    const preparedArchive = pruneArchiveData(archiveData, allowedArchiveCols);

    await trx(targetTable).insert(preparedArchive);
    await trx(TABLES.orderList).where({ id: orderId }).del();

    await trx.commit();
    return { success: true, movedTo: shouldArchiveToCanceled ? "canceled" : "expired", deletedOrder: normalized };
};

module.exports = {
    deleteOrderWithArchive,
};
