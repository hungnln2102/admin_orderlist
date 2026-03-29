const {
    normalizeDateInput,
    toNullableNumber,
    normalizeTextInput,
} = require("../../../utils/normalizers");
const { COLS } = require("../constants");

const ORDER_WRITABLE_COLUMNS = [
    COLS.ORDER.ID_ORDER, COLS.ORDER.ID_PRODUCT, COLS.ORDER.INFORMATION_ORDER,
    COLS.ORDER.CUSTOMER, COLS.ORDER.CONTACT, COLS.ORDER.SLOT,
    COLS.ORDER.ORDER_DATE, COLS.ORDER.DAYS, COLS.ORDER.EXPIRY_DATE,
    COLS.ORDER.ID_SUPPLY, COLS.ORDER.COST, COLS.ORDER.PRICE,
    COLS.ORDER.NOTE, COLS.ORDER.STATUS,
];

const sanitizeOrderWritePayload = (raw = {}) => {
    const sanitized = {};
    ORDER_WRITABLE_COLUMNS.forEach((col) => {
        if (raw[col] === undefined) return;

        let val = raw[col];
        if (col === COLS.ORDER.ORDER_DATE || col === COLS.ORDER.EXPIRY_DATE) {
            val = normalizeDateInput(val);
        } else if (col === COLS.ORDER.COST || col === COLS.ORDER.PRICE || col === COLS.ORDER.DAYS || col === COLS.ORDER.ID_SUPPLY) {
            val = toNullableNumber(val);
        } else if (typeof val === "string") {
            val = val.trim();
        }
        sanitized[col] = val;
    });
    return sanitized;
};

module.exports = {
    ORDER_WRITABLE_COLUMNS,
    sanitizeOrderWritePayload,
    normalizeTextInput,
};
