const updateOrderWithFinance = async ({
    trx,
    id,
    payload,
    helpers,
}) => {
    const {
        TABLES,
        STATUS,
        sanitizeOrderWritePayload,
        normalizeOrderRow,
        todayYMDInVietnam,
    } = helpers;
    const { addSupplierImportOnProcessing } = require("./orderFinanceHelpers");
    const logger = require("../../utils/logger");

    const sanitized = sanitizeOrderWritePayload(payload);
    delete sanitized.id;

    if (Object.keys(sanitized).length === 0) {
        return { error: "Không có trường nào cần cập nhật." };
    }

    const beforeOrder = await trx(TABLES.orderList).where({ id }).first();
    if (!beforeOrder) {
        return { notFound: true };
    }

    const [updatedOrder] = await trx(TABLES.orderList)
        .where({ id })
        .update(sanitized)
        .returning("*");

    if (!updatedOrder) {
        return { notFound: true };
    }

    try {
        await addSupplierImportOnProcessing(trx, beforeOrder, updatedOrder);
    } catch (debtErr) {
        logger.error("Lỗi cập nhật công nợ NCC", {
            id,
            supply: updatedOrder?.supply,
            cost: updatedOrder?.cost,
            status: updatedOrder?.status,
            error: debtErr?.message || String(debtErr),
            stack: debtErr?.stack,
        });
    }

    const toISO = (d) => (d ? d.toISOString().split("T")[0] : null);
    updatedOrder.order_date_raw = toISO(updatedOrder.order_date);
    updatedOrder.order_expired_raw = toISO(updatedOrder.order_expired);

    return { updated: normalizeOrderRow(updatedOrder, todayYMDInVietnam()) };
};

module.exports = {
    updateOrderWithFinance,
};
