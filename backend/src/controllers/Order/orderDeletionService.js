const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName } = require("../../config/dbSchema");

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
    const { isMavnImportOrder } = require("../../utils/orderHelpers");
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
        const isMavn = isMavnImportOrder(order);
        const bodyRefund =
            toNullableNumber(reqBody?.can_hoan) ??
            toNullableNumber(reqBody?.gia_tri_con_lai);

        let refundValue;
        if (isMavn) {
            const importRefund =
                bodyRefund !== null && bodyRefund !== undefined
                    ? Math.max(0, bodyRefund)
                    : calcRemainingImport(order, normalized);
            refundValue =
                importRefund != null && Number.isFinite(importRefund)
                    ? Math.max(0, Math.round(importRefund))
                    : 0;
        } else {
            refundValue =
                bodyRefund !== null && bodyRefund !== undefined
                    ? Math.max(0, bodyRefund)
                    : calcRemainingRefund(order, normalized);
        }

        const archiveStatus = isMavn ? STATUS.CANCELED : STATUS.PENDING_REFUND;

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

        const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
        const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
        const costCol = ORDERS_SCHEMA.ORDER_LIST.COLS.COST;
        if (order?.[supplyIdCol] != null) {
            const costLogTable = tableName(
                PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE,
                SCHEMA_PARTNER
            );
            const logCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;
            const nccRefundForLog = isMavn
                ? refundValue
                : (() => {
                    const r = calcRemainingImport(order, normalized);
                    return r != null && Number.isFinite(Number(r))
                        ? Math.max(0, Math.round(Number(r)))
                        : 0;
                })();
            const idOrderVal = String(order[idOrderCol] ?? "").trim();
            const importCostVal = Math.max(
                0,
                Math.round(toNullableNumber(order[costCol]) || 0)
            );
            await trx(costLogTable).insert({
                [logCols.ORDER_LIST_ID]: orderId,
                [logCols.SUPPLY_ID]: order[supplyIdCol],
                [logCols.ID_ORDER]: idOrderVal || "",
                [logCols.IMPORT_COST]: importCostVal,
                [logCols.REFUND_AMOUNT]: nccRefundForLog,
                [logCols.NCC_PAYMENT_STATUS]: "Chưa Thanh Toán",
            });
        }

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
    return { success: true, movedTo: shouldArchiveToCanceled ? "canceled" : "expired", deletedOrder: normalized };
};

module.exports = {
    deleteOrderWithArchive,
};
