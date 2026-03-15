const {
    normalizeDateInput,
    toNullableNumber,
    normalizeTextInput,
    todayYMDInVietnam,
    formatYMDToDMY,
} = require("../../utils/normalizers");
const { getNextSupplyId, nextId } = require("../../services/idService");
const { db } = require("../../db");
const { TABLES, COLS, STATUS } = require("./constants");
const { PARTNER_SCHEMA, PRODUCT_SCHEMA, SCHEMA_PRODUCT } = require("../../config/dbSchema");
const { findProductIdByName } = require("../ProductsController/finders");

const normalizeRawToYMD = (value) => {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, "0");
        const d = String(value.getDate()).padStart(2, "0");
        return Number.isFinite(y) && Number.isFinite(value.getTime()) ? `${y}-${m}-${d}` : null;
    }
    const s = String(value).trim();
    if (!s) return null;
    // Cho phép có thêm phần sau ngày (vd: "28/02/2026 00:00", "2026-02-28T00:00:00")
    const ymdMatch = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (ymdMatch) return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    const dmyMatch = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    const compactMatch = s.match(/^(\d{4})(\d{2})(\d{2})/);
    if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
    return null;
};

// Tính ngày hết hạn từ order_date + days khi DB không có cột expiry (order_expired/expiry_date).
const computeExpiryFromOrderDateAndDays = (row) => {
    const orderDateCol = COLS.ORDER.ORDER_DATE;
    const daysCol = COLS.ORDER.DAYS;
    const regRaw = row.order_date_raw || row.order_date || row[orderDateCol];
    const regYmd = normalizeRawToYMD(regRaw);
    if (!regYmd) return null;
    const days = Number(row.days ?? row[daysCol] ?? 0);
    if (!Number.isFinite(days) || days <= 0) return regYmd;
    const [y, m, d] = regYmd.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days - 1);
    const ey = date.getUTCFullYear();
    const em = String(date.getUTCMonth() + 1).padStart(2, "0");
    const ed = String(date.getUTCDate()).padStart(2, "0");
    return Number.isFinite(ey) ? `${ey}-${em}-${ed}` : null;
};

const normalizeOrderRow = (
    row,
    todayYmd = todayYMDInVietnam(),
    options = {}
) => {
    const registrationRaw = row.order_date_raw || row.order_date || row[COLS.ORDER.ORDER_DATE];
    const expiryRaw = row.expiry_date_raw || row.expiry_date || row[COLS.ORDER.EXPIRY_DATE];

    const registrationYmd = normalizeRawToYMD(registrationRaw);
    let expiryYmd = normalizeRawToYMD(expiryRaw);
    if (!expiryYmd) expiryYmd = computeExpiryFromOrderDateAndDays(row);

    // Số ngày còn lại = (expiry_date - hôm nay), dùng UTC để tránh lệch timezone
    let soNgayConLai = null;
    if (expiryYmd && todayYmd) {
        const [ey, em, ed] = expiryYmd.split("-").map(Number);
        const [ty, tm, td] = todayYmd.split("-").map(Number);
        const expiryUtc = Date.UTC(ey, em - 1, ed);
        const todayUtc = Date.UTC(ty, tm - 1, td);
        soNgayConLai = Math.floor((expiryUtc - todayUtc) / (24 * 60 * 60 * 1000));
    }
    if (!Number.isFinite(soNgayConLai) || soNgayConLai < 0) {
        soNgayConLai = null;
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
    COLS.ORDER.ORDER_DATE, COLS.ORDER.DAYS, COLS.ORDER.EXPIRY_DATE,
    COLS.ORDER.ID_SUPPLY, COLS.ORDER.COST, COLS.ORDER.PRICE,
    COLS.ORDER.NOTE, COLS.ORDER.STATUS
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

/**
 * Resolve product name (display_name, variant_name, package_name) to variant id.
 * Returns null if not found.
 */
const resolveProductToVariantId = async(productNameOrId) => {
    if (productNameOrId == null) return null;
    const num = Number(productNameOrId);
    if (Number.isFinite(num) && num > 0) return num;
    const name = String(productNameOrId).trim();
    if (!name) return null;
    const displayNameCol = PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME || "display_name";
    const variantNameCol = PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME || "variant_name";
    const row = await db(TABLES.variant)
        .where(displayNameCol, name)
        .orWhere(variantNameCol, name)
        .select(PRODUCT_SCHEMA.VARIANT.COLS.ID)
        .first();
    if (row && Number.isFinite(Number(row[PRODUCT_SCHEMA.VARIANT.COLS.ID]))) {
        return Number(row[PRODUCT_SCHEMA.VARIANT.COLS.ID]);
    }
    // Fallback: tìm theo package_name và fuzzy match (findProductIdByName)
    const { variantId } = await findProductIdByName(name);
    return variantId;
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

/**
 * Đảm bảo tồn tại bản ghi supplier_cost cho cặp variant + supplier.
 * Tạo mới nếu chưa có; cập nhật giá nếu thay đổi.
 */
const ensureSupplierCost = async (variantId, supplierId, cost) => {
    if (!variantId || !supplierId) return;
    const price = Number(cost);
    if (!Number.isFinite(price) || price <= 0) return;

    const scCols = COLS.SUPPLIER_COST;
    const existing = await db(TABLES.supplierCost)
        .where(scCols.VARIANT_ID, variantId)
        .andWhere(scCols.SUPPLIER_ID, supplierId)
        .first();

    if (existing) {
        if (Number(existing[scCols.PRICE]) !== price) {
            await db(TABLES.supplierCost)
                .where(scCols.ID, existing[scCols.ID])
                .update({ [scCols.PRICE]: price });
        }
        return;
    }

    const newId = await nextId(TABLES.supplierCost, scCols.ID);
    await db(TABLES.supplierCost).insert({
        [scCols.ID]: newId,
        [scCols.VARIANT_ID]: variantId,
        [scCols.SUPPLIER_ID]: supplierId,
        [scCols.PRICE]: price,
    });
};

/**
 * Tìm hoặc tạo mới product + variant theo tên hiển thị.
 * Tương tự ensureSupplyRecord nhưng cho phía sản phẩm.
 */
const ensureVariantRecord = async (productName) => {
    if (!productName) return null;
    const name = String(productName).trim();
    if (!name) return null;

    const displayNameCol = PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME;
    const variantNameCol = PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME;
    const variantIdCol = PRODUCT_SCHEMA.VARIANT.COLS.ID;

    const existing = await db(TABLES.variant)
        .where(displayNameCol, name)
        .orWhere(variantNameCol, name)
        .select(variantIdCol)
        .first();
    if (existing && Number.isFinite(Number(existing[variantIdCol]))) {
        return Number(existing[variantIdCol]);
    }

    return db.transaction(async (trx) => {
        const productIdCol = PRODUCT_SCHEMA.PRODUCT.COLS.ID;
        const packageNameCol = PRODUCT_SCHEMA.PRODUCT.COLS.PACKAGE_NAME;
        const isActiveCol = PRODUCT_SCHEMA.PRODUCT.COLS.IS_ACTIVE;

        const productId = await nextId(TABLES.product, productIdCol, trx);
        await trx(TABLES.product).insert({
            [productIdCol]: productId,
            [packageNameCol]: name,
            [isActiveCol]: true,
        });

        const variantId = await nextId(TABLES.variant, variantIdCol, trx);
        await trx(TABLES.variant).insert({
            [variantIdCol]: variantId,
            [PRODUCT_SCHEMA.VARIANT.COLS.PRODUCT_ID]: productId,
            [variantNameCol]: name,
            [displayNameCol]: name,
            [PRODUCT_SCHEMA.VARIANT.COLS.IS_ACTIVE]: true,
        });

        return variantId;
    });
};

module.exports = {
    normalizeRawToYMD,
    normalizeOrderRow,
    ORDER_WRITABLE_COLUMNS,
    sanitizeOrderWritePayload,
    ensureSupplyRecord,
    ensureSupplierCost,
    ensureVariantRecord,
    resolveProductToVariantId,
    normalizeTextInput,
};
