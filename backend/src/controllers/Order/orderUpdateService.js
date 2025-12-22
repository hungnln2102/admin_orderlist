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
    const { addSupplierImportOnCheck } = require("./orderFinanceHelpers");

    const sanitized = sanitizeOrderWritePayload(payload);
    delete sanitized.id;

    if (sanitized.status === STATUS.PAID && sanitized.check_flag === undefined) {
        sanitized.check_flag = true;
    }

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
        await addSupplierImportOnCheck(trx, beforeOrder, updatedOrder);
    } catch (debtErr) {
        console.error("Lỗi cập nhật công nợ NCC:", {
            id,
            supply: updatedOrder?.supply,
            cost: updatedOrder?.cost,
            status: updatedOrder?.status,
            check_flag: updatedOrder?.check_flag,
            error: debtErr?.message || debtErr,
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
