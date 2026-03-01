const { PARTNER_SCHEMA, ORDERS_SCHEMA, SCHEMA_PARTNER, tableName } = require("../../config/dbSchema");
const { resolveSupplierNameColumn } = require("../SuppliesController/helpers");
const { STATUS } = require("./constants");
const { toNullableNumber } = require("../../utils/normalizers");
const TABLES = require("./constants").TABLES;

const paymentSupplyCols = PARTNER_SCHEMA.PAYMENT_SUPPLY.COLS;
const PAYMENT_SUPPLY_TABLE = tableName(
  PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE,
  SCHEMA_PARTNER
);

const ceilToThousands = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return 0;
    const abs = Math.abs(num);
    const rounded = Math.ceil(abs / 1000) * 1000;
    return num < 0 ? -rounded : rounded;
};

const calcRemainingRefund = (orderRow, normalized) => {
    const price = toNullableNumber(orderRow?.price);
    const totalDays = toNullableNumber(orderRow?.days);
    const remainingDays = toNullableNumber(normalized?.so_ngay_con_lai);
    if (!price) return 0;
    if (!totalDays || remainingDays === null || remainingDays === undefined) {
        return Math.max(0, Math.round(price));
    }
    const effectiveRemaining = Math.max(0, remainingDays);
    const computed = (price * effectiveRemaining) / totalDays;
    return Math.max(0, Math.round(computed));
};

const calcRemainingImport = (orderRow, normalized) => {
    const baseCost = toNullableNumber(orderRow?.cost);
    const totalDays = toNullableNumber(orderRow?.days);
    const remainingDays = toNullableNumber(normalized?.so_ngay_con_lai);
    if (!baseCost || baseCost <= 0) return null;
    if (!totalDays || totalDays <= 0) return null;
    if (remainingDays === null || remainingDays === undefined) return null;
    const effectiveRemaining = Math.max(0, remainingDays);
    return (baseCost * effectiveRemaining) / totalDays;
};

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

const increaseSupplierDebt = async(trx, supplyId, amount, noteDate = new Date()) => {
    const costValue = toNullableNumber(amount);
    if (!supplyId || !costValue || costValue <= 0) return;

    const colId = paymentSupplyCols.ID;
    const colImport = paymentSupplyCols.IMPORT_VALUE;
    const colPaid = paymentSupplyCols.PAID;
    const colStatus = paymentSupplyCols.STATUS;
    const colSourceId = paymentSupplyCols.SOURCE_ID;
    const colRound = paymentSupplyCols.ROUND;

    // Chỉ cộng vào chu kỳ đang "Chưa Thanh Toán" (tránh ghi đè chu kỳ đã PAID)
    const latestCycle = await trx(PAYMENT_SUPPLY_TABLE)
        .where(colSourceId, supplyId)
        .andWhere(colStatus, STATUS.UNPAID)
        .orderBy(colId, "desc")
        .first();

    const formatNote = () => {
        const dt = noteDate instanceof Date ? noteDate : new Date();
        const day = String(dt.getDate()).padStart(2, "0");
        const month = String(dt.getMonth() + 1).padStart(2, "0");
        const year = dt.getFullYear();
        return `${day}/${month}/${year}`;
    };

    if (latestCycle) {
        const currentImport = toNullableNumber(latestCycle[colImport]) || 0;
        const currentPaid = toNullableNumber(latestCycle[colPaid]) || 0;
        const nextImport = currentImport + costValue;
        const updatePayload = {
            [colImport]: nextImport,
            [colPaid]: currentPaid,
        };
        // Giữ nguyên status UNPAID
        if (latestCycle[colStatus] !== undefined) updatePayload[colStatus] = latestCycle[colStatus];
        await trx(PAYMENT_SUPPLY_TABLE)
            .where(colId, latestCycle[colId])
            .update(updatePayload);
    } else {
        await trx(PAYMENT_SUPPLY_TABLE).insert({
            [colSourceId]: supplyId,
            [colImport]: costValue,
            [colPaid]: 0,
            [colRound]: formatNote(),
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

    // Trừ vào chu kỳ UNPAID nếu có; nếu không có chu kỳ UNPAID (đã PAID hết),
    // tạo một dòng điều chỉnh âm để thể hiện NCC đang "dư/hoàn" lại.
    const latestCycle = await trx(PAYMENT_SUPPLY_TABLE)
        .where(colSourceId, supplyId)
        .andWhere(colStatus, STATUS.UNPAID)
        .orderBy(colId, "desc")
        .first();

    const formatNote = () => {
        const dt = noteDate instanceof Date ? noteDate : new Date();
        const day = String(dt.getDate()).padStart(2, "0");
        const month = String(dt.getMonth() + 1).padStart(2, "0");
        const year = dt.getFullYear();
        return `${day}/${month}/${year}`;
    };

    if (latestCycle) {
        const currentImport = toNullableNumber(latestCycle[colImport]) || 0;
        const currentPaid = toNullableNumber(latestCycle[colPaid]) || 0;
        const nextImport = currentImport - costValue;

        const roundValue = latestCycle[colRound] != null ? String(latestCycle[colRound]) : formatNote();

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
            [colRound]: `ADJ - ${formatNote()}`,
            [colStatus]: STATUS.UNPAID,
        });
    }
};

const adjustSupplierDebtIfNeeded = async(trx, orderRow, normalized) => {
    const logger = require("../../utils/logger");
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

const addSupplierImportOnProcessing = async (trx, beforeRow, afterRow) => {
    const prevStatus = (beforeRow?.status ?? STATUS.UNPAID) || STATUS.UNPAID;
    const nextStatus = (afterRow?.status ?? STATUS.UNPAID) || STATUS.UNPAID;

    if (prevStatus === nextStatus || nextStatus !== STATUS.PROCESSING) return;

    const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
    const supplyId =
        (afterRow?.[supplyIdCol] != null ? Number(afterRow[supplyIdCol]) || null : null) ||
        (beforeRow?.[supplyIdCol] != null ? Number(beforeRow[supplyIdCol]) || null : null) ||
        (await findSupplyIdByName(trx, afterRow?.supply)) ||
        (await findSupplyIdByName(trx, beforeRow?.supply));
    if (!supplyId) return;

    const costValue = toNullableNumber(afterRow?.cost ?? beforeRow?.cost);
    if (!costValue || costValue <= 0) return;

    await increaseSupplierDebt(trx, supplyId, costValue, afterRow?.order_date);
};

module.exports = {
    ceilToThousands,
    calcRemainingRefund,
    findSupplyIdByName,
    increaseSupplierDebt,
    decreaseSupplierDebt,
    adjustSupplierDebtIfNeeded,
    addSupplierImportOnProcessing,
};
