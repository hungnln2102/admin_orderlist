const { PARTNER_SCHEMA, ORDERS_SCHEMA, SCHEMA_PARTNER, tableName } = require("../../../config/dbSchema");
const { resolveSupplierNameColumn } = require("../../SuppliesController/helpers");
const { STATUS, TABLES } = require("../constants");
const { toNullableNumber } = require("../../../utils/normalizers");
const logger = require("../../../utils/logger");
const { isMavnImportOrder } = require("../../../utils/orderHelpers");
const { calcRemainingImport, ceilToThousands } = require("./refunds");

const paymentSupplyCols = PARTNER_SCHEMA.PAYMENT_SUPPLY.COLS;
const PAYMENT_SUPPLY_TABLE = tableName(
    PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE,
    SCHEMA_PARTNER
);

const findSupplyIdByName = async(trx, supplyNameRaw) => {
    const supplyName = supplyNameRaw === undefined || supplyNameRaw === null
        ? ""
        : String(supplyNameRaw);
    if (!supplyName) return null;

    const supplierNameCol = await resolveSupplierNameColumn();
    const row = await trx(TABLES.supplier)
        .select(PARTNER_SCHEMA.SUPPLIER.COLS.ID)
        .where(supplierNameCol, supplyName)
        .first();
    return row && row[PARTNER_SCHEMA.SUPPLIER.COLS.ID] !== undefined
        ? Number(row[PARTNER_SCHEMA.SUPPLIER.COLS.ID]) || null
        : null;
};

const formatNoteDate = (noteDate = new Date()) => {
    const dt = noteDate instanceof Date ? noteDate : new Date();
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
};

const increaseSupplierDebt = async(trx, supplyId, amount, noteDate = new Date()) => {
    const costValue = toNullableNumber(amount);
    if (!supplyId || !costValue || costValue <= 0) return;

    const colId = paymentSupplyCols.ID;
    const colImport = paymentSupplyCols.IMPORT_VALUE;
    const colPaid = paymentSupplyCols.PAID;
    const colStatus = paymentSupplyCols.STATUS;
    const colSourceId = paymentSupplyCols.SOURCE_ID;
    const colRound = paymentSupplyCols.ROUND;

    const latestCycle = await trx(PAYMENT_SUPPLY_TABLE)
        .where(colSourceId, supplyId)
        .andWhere(colStatus, STATUS.UNPAID)
        .orderBy(colId, "desc")
        .first();

    if (latestCycle) {
        const currentImport = toNullableNumber(latestCycle[colImport]) || 0;
        const currentPaid = toNullableNumber(latestCycle[colPaid]) || 0;
        const nextImport = currentImport + costValue;
        const updatePayload = {
            [colImport]: nextImport,
            [colPaid]: currentPaid,
        };
        if (latestCycle[colStatus] !== undefined) updatePayload[colStatus] = latestCycle[colStatus];
        await trx(PAYMENT_SUPPLY_TABLE)
            .where(colId, latestCycle[colId])
            .update(updatePayload);
    } else {
        await trx(PAYMENT_SUPPLY_TABLE).insert({
            [colSourceId]: supplyId,
            [colImport]: costValue,
            [colPaid]: 0,
            [colRound]: formatNoteDate(noteDate),
            [colStatus]: STATUS.UNPAID,
        });
    }
};

const decreaseSupplierDebt = async(trx, supplyId, amount, noteDate = new Date()) => {
    const costValue = toNullableNumber(amount);
    if (!supplyId || !costValue || costValue <= 0) return;

    const colId = paymentSupplyCols.ID;
    const colImport = paymentSupplyCols.IMPORT_VALUE;
    const colPaid = paymentSupplyCols.PAID;
    const colStatus = paymentSupplyCols.STATUS;
    const colSourceId = paymentSupplyCols.SOURCE_ID;
    const colRound = paymentSupplyCols.ROUND;

    const latestCycle = await trx(PAYMENT_SUPPLY_TABLE)
        .where(colSourceId, supplyId)
        .andWhere(colStatus, STATUS.UNPAID)
        .orderBy(colId, "desc")
        .first();

    if (latestCycle) {
        const currentImport = toNullableNumber(latestCycle[colImport]) || 0;
        const currentPaid = toNullableNumber(latestCycle[colPaid]) || 0;
        const nextImport = currentImport - costValue;
        const roundValue = latestCycle[colRound] != null
            ? String(latestCycle[colRound])
            : formatNoteDate(noteDate);

        const updatePayload = {
            [colImport]: nextImport,
            [colPaid]: currentPaid,
            [colRound]: roundValue,
        };
        if (latestCycle[colStatus] !== undefined) updatePayload[colStatus] = latestCycle[colStatus];
        await trx(PAYMENT_SUPPLY_TABLE)
            .where(colId, latestCycle[colId])
            .update(updatePayload);
    } else {
        await trx(PAYMENT_SUPPLY_TABLE).insert({
            [colSourceId]: supplyId,
            [colImport]: -costValue,
            [colPaid]: 0,
            [colRound]: `ADJ - ${formatNoteDate(noteDate)}`,
            [colStatus]: STATUS.UNPAID,
        });
    }
};

const adjustSupplierDebtIfNeeded = async(trx, orderRow, normalized) => {
    if (isMavnImportOrder(orderRow) || isMavnImportOrder(normalized)) {
        return;
    }

    const statusValue =
        orderRow?.status ??
        normalized?.status ??
        normalized?.status_auto ??
        "";
    const isPaidLike =
        statusValue === STATUS.PROCESSING || statusValue === STATUS.PAID;

    if (!isPaidLike) {
        logger.debug("[Finance] adjustSupplierDebtIfNeeded skipped: status not PROCESSING/PAID", {
            status: statusValue,
            orderId: orderRow?.id,
        });
        return;
    }

    const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
    const supplyId = orderRow?.[supplyIdCol] != null
        ? Number(orderRow[supplyIdCol]) || null
        : await findSupplyIdByName(trx, orderRow?.supply);
    if (!supplyId) {
        logger.warn("[Finance] adjustSupplierDebtIfNeeded skipped: supplier not found", {
            supply_id: orderRow?.[supplyIdCol],
            supply: orderRow?.supply,
            orderId: orderRow?.id,
        });
        return;
    }

    const prorated = calcRemainingImport(orderRow, normalized);
    if (!prorated || prorated <= 0) {
        logger.warn("[Finance] adjustSupplierDebtIfNeeded skipped: no prorated cost", {
            cost: orderRow?.cost,
            days: orderRow?.days,
            so_ngay_con_lai: normalized?.so_ngay_con_lai,
            prorated,
            orderId: orderRow?.id,
        });
        return;
    }

    const roundedProrated = ceilToThousands(prorated);
    if (!Number.isFinite(roundedProrated) || roundedProrated <= 0) {
        logger.warn("[Finance] adjustSupplierDebtIfNeeded skipped: rounded prorated is 0", {
            prorated,
            roundedProrated,
            orderId: orderRow?.id,
        });
        return;
    }

    logger.info("[Finance] Decreasing supplier debt", {
        supplyId,
        roundedProrated,
        orderId: orderRow?.id,
    });
    await decreaseSupplierDebt(trx, supplyId, roundedProrated);
};

const recordSupplierPaymentOnCompletion = async(trx, beforeRow, afterRow) => {
    if (isMavnImportOrder(beforeRow) || isMavnImportOrder(afterRow)) {
        return;
    }

    const prevStatus = (beforeRow?.status ?? STATUS.UNPAID) || STATUS.UNPAID;
    const nextStatus = (afterRow?.status ?? STATUS.UNPAID) || STATUS.UNPAID;

    if (prevStatus === nextStatus || prevStatus !== STATUS.PROCESSING || nextStatus !== STATUS.PAID) return;

    const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
    const supplyId =
        (afterRow?.[supplyIdCol] != null ? Number(afterRow[supplyIdCol]) || null : null) ||
        (beforeRow?.[supplyIdCol] != null ? Number(beforeRow[supplyIdCol]) || null : null) ||
        (await findSupplyIdByName(trx, afterRow?.supply)) ||
        (await findSupplyIdByName(trx, beforeRow?.supply));
    if (!supplyId) return;

    const costValue = toNullableNumber(afterRow?.cost ?? beforeRow?.cost);
    if (!costValue || costValue <= 0) return;

    const colId = paymentSupplyCols.ID;
    const colImport = paymentSupplyCols.IMPORT_VALUE;
    const colPaid = paymentSupplyCols.PAID;
    const colStatus = paymentSupplyCols.STATUS;
    const colSourceId = paymentSupplyCols.SOURCE_ID;

    const latestCycle = await trx(PAYMENT_SUPPLY_TABLE)
        .where(colSourceId, supplyId)
        .andWhere(colStatus, STATUS.UNPAID)
        .orderBy(colId, "desc")
        .first();

    if (latestCycle) {
        const currentImport = toNullableNumber(latestCycle[colImport]) || 0;
        const currentPaid = toNullableNumber(latestCycle[colPaid]) || 0;
        await trx(PAYMENT_SUPPLY_TABLE)
            .where(colId, latestCycle[colId])
            .update({
                [colImport]: currentImport - costValue,
                [colPaid]: currentPaid + costValue,
            });
    }
};

const addSupplierImportOnProcessing = async(trx, beforeRow, afterRow) => {
    if (isMavnImportOrder(beforeRow) || isMavnImportOrder(afterRow)) {
        return;
    }

    const prevStatus = (beforeRow?.status ?? STATUS.UNPAID) || STATUS.UNPAID;
    const nextStatus = (afterRow?.status ?? STATUS.UNPAID) || STATUS.UNPAID;

    const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;

    if (prevStatus !== nextStatus && nextStatus === STATUS.PROCESSING) {
        const supplyId =
            (afterRow?.[supplyIdCol] != null ? Number(afterRow[supplyIdCol]) || null : null) ||
            (beforeRow?.[supplyIdCol] != null ? Number(beforeRow[supplyIdCol]) || null : null) ||
            (await findSupplyIdByName(trx, afterRow?.supply)) ||
            (await findSupplyIdByName(trx, beforeRow?.supply));
        if (!supplyId) return;

        const costValue = toNullableNumber(afterRow?.cost ?? beforeRow?.cost);
        if (!costValue || costValue <= 0) return;

        await increaseSupplierDebt(trx, supplyId, costValue, afterRow?.order_date);
        return;
    }

    if (prevStatus === STATUS.PROCESSING && nextStatus === STATUS.PROCESSING) {
        const oldSupplyId = beforeRow?.[supplyIdCol] != null ? Number(beforeRow[supplyIdCol]) || null : null;
        const newSupplyId = afterRow?.[supplyIdCol] != null ? Number(afterRow[supplyIdCol]) || null : null;

        if (!oldSupplyId || !newSupplyId || oldSupplyId === newSupplyId) return;

        const oldCost = toNullableNumber(beforeRow?.cost);
        const newCost = toNullableNumber(afterRow?.cost);

        if (oldCost && oldCost > 0) {
            await decreaseSupplierDebt(trx, oldSupplyId, oldCost);
        }
        if (newCost && newCost > 0) {
            await increaseSupplierDebt(trx, newSupplyId, newCost, afterRow?.order_date);
        }
    }
};

module.exports = {
    findSupplyIdByName,
    increaseSupplierDebt,
    decreaseSupplierDebt,
    adjustSupplierDebtIfNeeded,
    addSupplierImportOnProcessing,
    recordSupplierPaymentOnCompletion,
};
