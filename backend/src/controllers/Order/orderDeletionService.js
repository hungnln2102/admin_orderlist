const deleteOrderWithArchive = async ({
    trx,
    order,
    normalized,
    reqBody,
    helpers,
}) => {
    const {
        TABLES,
        DB_SCHEMA,
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

    const orderId = order?.id;

    // Điều chỉnh công nợ NCC (nếu cần), không chặn flow khi lỗi.
    try {
        await adjustSupplierDebtIfNeeded(trx, order, normalized);
    } catch (debtErr) {
        console.log("Lỗi khi trừ/cộng công nợ NCC:", {
            id: orderId,
            supply: order?.supply,
            cost: order?.cost,
            status: order?.status,
            check_flag: order?.check_flag,
            error: debtErr?.message || debtErr,
        });
    }

    const isHardDelete =
        normalized.status === STATUS.UNPAID && normalized.check_flag === null;

    if (isHardDelete) {
        await trx(TABLES.orderList).where({ id: orderId }).del();
        await trx.commit();
        return { success: true, movedTo: "deleted", deletedOrder: normalized };
    }

    const remaining = normalized.so_ngay_con_lai;
    const isExpired = remaining !== null && remaining < 4;
    const targetTable = isExpired ? TABLES.orderExpired : TABLES.orderCanceled;

    const archiveData = { ...order };
    const archiveIdCol = isExpired
        ? DB_SCHEMA.ORDER_EXPIRED.COLS.ID
        : DB_SCHEMA.ORDER_CANCELED.COLS.ID;
    if (!archiveData[archiveIdCol]) {
        archiveData[archiveIdCol] = await nextId(targetTable, archiveIdCol, trx);
    }

    if (isExpired) {
        archiveData[DB_SCHEMA.ORDER_EXPIRED.COLS.ARCHIVED_AT] = new Date();
    } else {
        const refundValue = calcRemainingRefund(order, normalized);
        archiveData[DB_SCHEMA.ORDER_CANCELED.COLS.REFUND] = refundValue;
        archiveData.status = STATUS.PENDING_REFUND;
        archiveData.check_flag = false;
        archiveData[DB_SCHEMA.ORDER_CANCELED.COLS.CREATED_AT] = new Date();
    }

    const allowedArchiveCols = isExpired
        ? allowedArchiveColsExpired
        : allowedArchiveColsCanceled;
    const preparedArchive = pruneArchiveData(archiveData, allowedArchiveCols);

    await trx(targetTable).insert(preparedArchive);
    await trx(TABLES.orderList).where({ id: orderId }).del();

    await trx.commit();
    return { success: true, movedTo: isExpired ? "expired" : "canceled", deletedOrder: normalized };
};

module.exports = {
    deleteOrderWithArchive,
};
