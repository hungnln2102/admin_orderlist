const { PARTNER_SCHEMA, ORDERS_SCHEMA, SCHEMA_PARTNER, FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../config/dbSchema");
const { resolveSupplierNameColumn } = require("../SuppliesController/helpers");
const { STATUS } = require("./constants");
const { toNullableNumber } = require("../../utils/normalizers");
const TABLES = require("./constants").TABLES;

const paymentSupplyCols = PARTNER_SCHEMA.PAYMENT_SUPPLY.COLS;
const PAYMENT_SUPPLY_TABLE = tableName(
  PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE,
  SCHEMA_PARTNER
);

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const ceilToThousands = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return 0;
    const abs = Math.abs(num);
    const rounded = Math.ceil(abs / 1000) * 1000;
    return num < 0 ? -rounded : rounded;
};

const getMonthKey = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
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

const recordSupplierPaymentOnCompletion = async (trx, beforeRow, afterRow) => {
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

const addSupplierImportOnProcessing = async (trx, beforeRow, afterRow) => {
    const prevStatus = (beforeRow?.status ?? STATUS.UNPAID) || STATUS.UNPAID;
    const nextStatus = (afterRow?.status ?? STATUS.UNPAID) || STATUS.UNPAID;

    const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;

    // Case 1: Đơn chuyển sang Đang Xử Lý → cộng cost vào NCC mới
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

    // Case 2: Đơn vẫn Đang Xử Lý nhưng NCC thay đổi → trừ NCC cũ, cộng NCC mới
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

const updateDashboardMonthlySummaryOnStatusChange = async (trx, beforeRow, afterRow) => {
    const prevStatus = beforeRow?.status || STATUS.UNPAID;
    const nextStatus = afterRow?.status || STATUS.UNPAID;

    if (prevStatus === nextStatus) return;

    const orderDate = afterRow?.order_date || beforeRow?.order_date;
    if (!orderDate) return;

    const monthKey = getMonthKey(orderDate);
    if (!monthKey) return;

    const updates = {};

    // Nếu trước là PAID, giờ không phải, giảm PAID counters
    if (prevStatus === STATUS.PAID && nextStatus !== STATUS.PAID) {
        const price = toNullableNumber(beforeRow?.price) || 0;
        const cost = toNullableNumber(beforeRow?.cost) || 0;
        const profit = price - cost;
        updates.total_orders = (updates.total_orders || 0) - 1;
        updates.total_revenue = (updates.total_revenue || 0) - price;
        updates.total_profit = (updates.total_profit || 0) - profit;
    }

    // Nếu trước là REFUNDED hoặc PENDING_REFUND, giờ không phải, giảm REFUND counters
    if ((prevStatus === STATUS.REFUNDED || prevStatus === STATUS.PENDING_REFUND) && 
        nextStatus !== STATUS.REFUNDED && nextStatus !== STATUS.PENDING_REFUND) {
        const refund = toNullableNumber(beforeRow?.refund) || 0;
        updates.canceled_orders = (updates.canceled_orders || 0) - 1;
        updates.total_refund = (updates.total_refund || 0) - refund;
    }

    // Nếu giờ là PAID, trước không phải, tăng PAID counters
    if (nextStatus === STATUS.PAID && prevStatus !== STATUS.PAID) {
        const price = toNullableNumber(afterRow?.price) || 0;
        const cost = toNullableNumber(afterRow?.cost) || 0;
        const profit = price - cost;
        updates.total_orders = (updates.total_orders || 0) + 1;
        updates.total_revenue = (updates.total_revenue || 0) + price;
        updates.total_profit = (updates.total_profit || 0) + profit;
    }

    // Nếu giờ là REFUNDED hoặc PENDING_REFUND, trước không phải, tăng REFUND counters
    if ((nextStatus === STATUS.REFUNDED || nextStatus === STATUS.PENDING_REFUND) && 
        prevStatus !== STATUS.REFUNDED && prevStatus !== STATUS.PENDING_REFUND) {
        const refund = toNullableNumber(afterRow?.refund) || 0;
        updates.canceled_orders = (updates.canceled_orders || 0) + 1;
        updates.total_refund = (updates.total_refund || 0) + refund;
    }

    if (Object.keys(updates).length === 0) return;

    // Upsert
    const insertData = {
        [summaryCols.MONTH_KEY]: monthKey,
        [summaryCols.UPDATED_AT]: new Date(),
    };

    const mergeData = {
        [summaryCols.UPDATED_AT]: new Date(),
    };

    if (updates.total_orders !== undefined) {
        mergeData[summaryCols.TOTAL_ORDERS] = trx.raw(`GREATEST(0, ${summaryCols.TOTAL_ORDERS} + ${updates.total_orders})`);
    }

    if (updates.canceled_orders !== undefined) {
        mergeData[summaryCols.CANCELED_ORDERS] = trx.raw(`GREATEST(0, ${summaryCols.CANCELED_ORDERS} + ${updates.canceled_orders})`);
    }

    if (updates.total_revenue !== undefined) {
        mergeData[summaryCols.TOTAL_REVENUE] = trx.raw(`${summaryCols.TOTAL_REVENUE} + ${updates.total_revenue}`);
    }

    if (updates.total_profit !== undefined) {
        mergeData[summaryCols.TOTAL_PROFIT] = trx.raw(`${summaryCols.TOTAL_PROFIT} + ${updates.total_profit}`);
    }

    if (updates.total_refund !== undefined) {
        mergeData[summaryCols.TOTAL_REFUND] = trx.raw(`GREATEST(0, ${summaryCols.TOTAL_REFUND} + ${updates.total_refund})`);
    }

    await trx(summaryTable)
        .insert(insertData)
        .onConflict(summaryCols.MONTH_KEY)
        .merge(mergeData);
};

module.exports = {
    ceilToThousands,
    calcRemainingRefund,
    findSupplyIdByName,
    increaseSupplierDebt,
    decreaseSupplierDebt,
    adjustSupplierDebtIfNeeded,
    addSupplierImportOnProcessing,
    recordSupplierPaymentOnCompletion,
    updateDashboardMonthlySummaryOnStatusChange,
};
