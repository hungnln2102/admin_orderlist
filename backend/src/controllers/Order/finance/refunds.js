const { toNullableNumber } = require("../../../utils/normalizers");

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

module.exports = {
    ceilToThousands,
    calcRemainingRefund,
    calcRemainingImport,
};
