const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName } = require("../../config/dbSchema");
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

    const latestCycle = await trx(PAYMENT_SUPPLY_TABLE)
        .where(colSourceId, supplyId)
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
        if (latestCycle[colStatus] !== undefined) {
            updatePayload[colStatus] = latestCycle[colStatus];
        }
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

    const latestCycle = await trx(PAYMENT_SUPPLY_TABLE)
        .where(colSourceId, supplyId)
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
        const updatePayload = {
            [colImport]: nextImport,
            [colPaid]: currentPaid,
        };
        if (latestCycle[colStatus] !== undefined) {
            updatePayload[colStatus] = latestCycle[colStatus];
        }
        await trx(PAYMENT_SUPPLY_TABLE)
            .where(colId, latestCycle[colId])
            .update(updatePayload);
    } else {
        await trx(PAYMENT_SUPPLY_TABLE).insert({
            [colSourceId]: supplyId,
            [colImport]: -costValue,
            [colPaid]: 0,
            [colRound]: formatNote(),
            [colStatus]: STATUS.UNPAID,
        });
    }
};

const adjustSupplierDebtIfNeeded = async(trx, orderRow, normalized) => {
    const statusValue =
        orderRow?.status ??
        normalized?.status ??
        normalized?.status_auto ??
        "";
    const checkFlagVal = orderRow?.check_flag ?? normalized?.check_flag;

    const isUnpaidCase = statusValue === STATUS.UNPAID && checkFlagVal === false;
    const isPaidCase = statusValue === STATUS.PAID && checkFlagVal === true;

    if (!isUnpaidCase && !isPaidCase) return;

    const supplyId = await findSupplyIdByName(trx, orderRow?.supply);
    if (!supplyId) return;

    if (isUnpaidCase) {
        await decreaseSupplierDebt(trx, supplyId, orderRow?.cost);
        return;
    }

    const remainingDays = toNullableNumber(normalized?.so_ngay_con_lai);
    const totalDays = toNullableNumber(orderRow?.days);
    const baseCost = toNullableNumber(orderRow?.cost);
    if (!baseCost || !remainingDays || remainingDays <= 0 || !totalDays || totalDays <= 0) return;

    const prorated = (baseCost * remainingDays) / totalDays;
    const roundedProrated = ceilToThousands(prorated);
    if (!Number.isFinite(roundedProrated) || roundedProrated <= 0) return;
    await decreaseSupplierDebt(trx, supplyId, roundedProrated);
};

const addSupplierImportOnCheck = async(trx, beforeRow, afterRow) => {
    const prevFlag = beforeRow?.check_flag;
    const nextFlag = afterRow?.check_flag;
    const prevStatus = (beforeRow?.status ?? STATUS.UNPAID) || STATUS.UNPAID;
    const nextStatus = (afterRow?.status ?? STATUS.UNPAID) || STATUS.UNPAID;

    const movedNullToFalse =
        (prevFlag === null || prevFlag === undefined) && nextFlag === false;
    const isStillUnpaid = nextStatus === STATUS.UNPAID;
    const wasUnpaid = prevStatus === STATUS.UNPAID;

    if (!(movedNullToFalse && isStillUnpaid && wasUnpaid)) return;

    const supplyId =
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
    addSupplierImportOnCheck,
};
