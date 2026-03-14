const { db } = require("../../db");
const { PARTNER_SCHEMA, ORDERS_SCHEMA, PRODUCT_SCHEMA } = require("../../config/dbSchema");

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
        ensureSupplyRecord,
        normalizeTextInput,
        resolveProductToVariantId,
    } = helpers;
    const { addSupplierImportOnProcessing, recordSupplierPaymentOnCompletion } = require("./orderFinanceHelpers");
    const logger = require("../../utils/logger");

    const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
    const productIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;
    // Accept supply (name) or id_supply/supply_id: resolve name -> id
    const raw = { ...payload };
    if (raw.supply != null && raw.supply !== "" && typeof raw.supply === "string") {
        const name = normalizeTextInput(String(raw.supply));
        if (name) {
            const resolvedId = await ensureSupplyRecord(name);
            raw[supplyIdCol] = resolvedId;
        }
        delete raw.supply;
    }

    // Chuẩn hoá id_product theo config DB hiện tại:
    // - Hỗ trợ field mới variant_id (ưu tiên nếu có).
    // - Cho phép truyền tên gói (display_name) hoặc mã số.
    // - Luôn convert sang variant_id (integer) để khớp kiểu cột id_product.
    if (raw[productIdCol] == null && payload?.variant_id != null) {
        const numericVariant = Number(payload.variant_id);
        if (Number.isFinite(numericVariant) && numericVariant > 0) {
            raw[productIdCol] = numericVariant;
        }
    }
    if (raw[productIdCol] != null) {
        const rawProduct = raw[productIdCol];
        const variantId = await resolveProductToVariantId(rawProduct);
        if (variantId != null) {
            raw[productIdCol] = variantId;
        } else if (typeof rawProduct === "string") {
            raw[productIdCol] = rawProduct.trim() || null;
        } else {
            raw[productIdCol] = Number(rawProduct) || null;
        }
    }

    const sanitized = sanitizeOrderWritePayload(raw);
    delete sanitized.id;

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
        await addSupplierImportOnProcessing(trx, beforeOrder, updatedOrder);
        await recordSupplierPaymentOnCompletion(trx, beforeOrder, updatedOrder);
    } catch (debtErr) {
        logger.error("Lỗi cập nhật công nợ NCC", {
            id,
            supply_id: updatedOrder?.[supplyIdCol],
            cost: updatedOrder?.cost,
            status: updatedOrder?.status,
            error: debtErr?.message || String(debtErr),
            stack: debtErr?.stack,
        });
    }

    const toISO = (d) => (d ? d.toISOString().split("T")[0] : null);
    updatedOrder.order_date_raw = toISO(updatedOrder.order_date);
    updatedOrder.expiry_date_raw = toISO(updatedOrder.expiry_date);

    const normalized = normalizeOrderRow(updatedOrder, todayYMDInVietnam());
    const supplyIdVal = updatedOrder?.[supplyIdCol];
    if (supplyIdVal != null) {
        const supplier = await db(TABLES.supplier)
            .select(PARTNER_SCHEMA.SUPPLIER.COLS.SUPPLIER_NAME)
            .where(PARTNER_SCHEMA.SUPPLIER.COLS.ID, supplyIdVal)
            .first();
        normalized.supply = supplier?.[PARTNER_SCHEMA.SUPPLIER.COLS.SUPPLIER_NAME] ?? "";
    }
    const variantIdVal = updatedOrder?.[productIdCol];
    if (variantIdVal != null && Number.isFinite(Number(variantIdVal))) {
        const variant = await db(TABLES.variant)
            .select(PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME, PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME)
            .where(PRODUCT_SCHEMA.VARIANT.COLS.ID, variantIdVal)
            .first();
        const displayName = variant?.[PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME]
            ?? variant?.[PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME];
        // variant_id luôn là ID variant (numeric)
        normalized.variant_id = Number(variantIdVal);
        if (displayName != null) {
            normalized.product_display_name = displayName;
            normalized.id_product = displayName;
        }
    }
    return { updated: normalized };
};

module.exports = {
    updateOrderWithFinance,
};
