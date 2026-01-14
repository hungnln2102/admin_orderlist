const {
    normalizeDateInput,
    toNullableNumber,
    normalizeTextInput,
    todayYMDInVietnam,
    formatYMDToDMY,
} = require("../../utils/normalizers");
const { getNextSupplyId } = require("../../services/idService");
const { db } = require("../../db");
const { TABLES, COLS, STATUS } = require("./constants");
const { PARTNER_SCHEMA, SCHEMA_PRODUCT } = require("../../config/dbSchema");

const normalizeRawToYMD = (value) => {
    if (!value) return null;
    const s = String(value).trim();
    const match =
        s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/) ||
        s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/) ||
        s.match(/^(\d{4})(\d{2})(\d{2})$/);

    if (!match) return null;
    if (s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
};

const normalizeOrderRow = (
    row,
    todayYmd = todayYMDInVietnam(),
    options = {}
) => {
    const registrationRaw = row.order_date_raw || row.order_date;
    const expiryRaw = row.order_expired_raw || row.order_expired;

    const registrationYmd = normalizeRawToYMD(registrationRaw);
    const expiryYmd = normalizeRawToYMD(expiryRaw);

    let soNgayConLai = null;
    if (expiryYmd && todayYmd) {
        const d1 = new Date(expiryYmd);
        const d2 = new Date(todayYmd);
        soNgayConLai = Math.floor((d1 - d2) / (24 * 60 * 60 * 1000));
    }
    if (!Number.isFinite(soNgayConLai)) {
        soNgayConLai = toNullableNumber(row.days);
    }

    const dbStatusRaw = row.status || STATUS.UNPAID;
    const autoStatus = dbStatusRaw;

    const registrationDisplay = formatYMDToDMY(registrationYmd);
    const expiryDisplay = formatYMDToDMY(expiryYmd);

    return {
        ...row,
        registration_date: registrationYmd,
        expiry_date: expiryYmd,
        registration_date_str: registrationDisplay,
        expiry_date_str: expiryDisplay,
        registration_date_display: registrationDisplay,
        expiry_date_display: expiryDisplay,
        so_ngay_con_lai: soNgayConLai,
        status: autoStatus,
        status_auto: autoStatus,
    };
};

const ORDER_WRITABLE_COLUMNS = [
    COLS.ORDER.ID_ORDER, COLS.ORDER.ID_PRODUCT, COLS.ORDER.INFORMATION_ORDER,
    COLS.ORDER.CUSTOMER, COLS.ORDER.CONTACT, COLS.ORDER.SLOT,
    COLS.ORDER.ORDER_DATE, COLS.ORDER.DAYS, COLS.ORDER.ORDER_EXPIRED,
    COLS.ORDER.SUPPLY, COLS.ORDER.COST, COLS.ORDER.PRICE,
    COLS.ORDER.NOTE, COLS.ORDER.STATUS
];

const sanitizeOrderWritePayload = (raw = {}) => {
    const sanitized = {};
    ORDER_WRITABLE_COLUMNS.forEach((col) => {
        if (raw[col] === undefined) return;

        let val = raw[col];
        if (col === COLS.ORDER.ORDER_DATE || col === COLS.ORDER.ORDER_EXPIRED) {
            val = normalizeDateInput(val);
        } else if (col === COLS.ORDER.COST || col === COLS.ORDER.PRICE || col === COLS.ORDER.DAYS) {
            val = toNullableNumber(val);
        } else if (typeof val === "string") {
            val = val.trim();
        }
        sanitized[col] = val;
    });
    return sanitized;
};

const ensureSupplyRecord = async(sourceName) => {
    if (!sourceName) return null;
    const name = sourceName.trim();

    const exist = await db(TABLES.supplier).where({ supplier_name: name }).first();
    if (exist) return exist.id;

    const nextId = await getNextSupplyId();
    const supplyTableName = PARTNER_SCHEMA.SUPPLIER.TABLE;
    const statusColRes = await db.raw(
        `
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = ? AND table_name = ? 
          AND column_name IN ('status', 'trang_thai', 'is_active') 
        LIMIT 1
    `,
        [SCHEMA_PRODUCT, supplyTableName]
    );
    const statusCol = statusColRes.rows?.[0]?.column_name;

    const newSupply = { id: nextId, supplier_name: name };
    if (statusCol) newSupply[statusCol] = "active";

    await db(TABLES.supplier).insert(newSupply);
    return nextId;
};

module.exports = {
    normalizeRawToYMD,
    normalizeOrderRow,
    ORDER_WRITABLE_COLUMNS,
    sanitizeOrderWritePayload,
    ensureSupplyRecord,
    normalizeTextInput,
};
