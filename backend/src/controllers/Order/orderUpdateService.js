const { db } = require("../../db");
const { PARTNER_SCHEMA, ORDERS_SCHEMA, PRODUCT_SCHEMA } = require("../../config/dbSchema");
const {
  isGiftOrder,
  isMavnImportOrder,
  isMavrykShopSupplierName,
} = require("../../utils/orderHelpers");
const { STATUS, COLS } = require("./constants");
const {
  changeOrderSupplier,
  ChangeSupplierError,
} = require("../../domains/supplier-change/service");

const updateOrderWithFinance = async ({
    trx,
    id,
    payload,
    helpers,
}) => {
    const {
        TABLES,
        sanitizeOrderWritePayload,
        normalizeOrderRow,
        todayYMDInVietnam,
        ensureSupplyRecord,
        normalizeTextInput,
        resolveProductToVariantId,
    } = helpers;
    const {
        updateDashboardMonthlySummaryOnStatusChange,
        syncMavnStoreProfitExpense,
    } = require("./orderFinanceHelpers");
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

    const priceCol = ORDERS_SCHEMA.ORDER_LIST.COLS.PRICE;
    if (isGiftOrder(beforeOrder)) {
        sanitized[priceCol] = 0;
    }

    // Đổi NCC: nếu supply_id trong payload khác supply_id hiện tại của đơn,
    // chuyển qua domain `supplier-change` (Flow A/B theo tuổi đơn + trạng thái log).
    // Service đó tự tính cost prorate; bỏ supply_id + cost khỏi sanitized để
    // tránh ghi đè giá trị service đã set.
    let supplierChangeResult = null;
    const beforeSupplyId = beforeOrder?.[supplyIdCol];
    const incomingSupplyId = sanitized[supplyIdCol];
    const supplyIdChanging =
        incomingSupplyId != null &&
        Number.isFinite(Number(incomingSupplyId)) &&
        Number(incomingSupplyId) !== Number(beforeSupplyId);

    if (supplyIdChanging) {
        try {
            supplierChangeResult = await changeOrderSupplier(id, Number(incomingSupplyId), {
                trx,
            });
        } catch (err) {
            if (err instanceof ChangeSupplierError) {
                return { error: err.message };
            }
            throw err;
        }
        delete sanitized[supplyIdCol];
        delete sanitized[ORDERS_SCHEMA.ORDER_LIST.COLS.COST];
    } else if (isMavnImportOrder(beforeOrder)) {
        // Đơn MAVN update:
        // - NCC Mavryk/Shop: cost luôn = 0.
        // - NCC khác: cost = price.
        // syncMavnStoreProfitExpense sẽ tự áp rule theo NCC:
        // Mavryk/Shop trừ profit+bank; NCC khác chỉ trừ profit qua log NCC.
        const newPriceRaw = sanitized[ORDERS_SCHEMA.ORDER_LIST.COLS.PRICE];
        if (newPriceRaw != null) {
            let isInternalSupplier = false;
            if (beforeSupplyId != null) {
                const supRow = await trx(TABLES.supplier)
                    .select(PARTNER_SCHEMA.SUPPLIER.COLS.SUPPLIER_NAME)
                    .where(PARTNER_SCHEMA.SUPPLIER.COLS.ID, beforeSupplyId)
                    .first();
                isInternalSupplier = isMavrykShopSupplierName(
                    supRow?.[PARTNER_SCHEMA.SUPPLIER.COLS.SUPPLIER_NAME]
                );
            }
            const numericPrice = Number(newPriceRaw);
            sanitized[ORDERS_SCHEMA.ORDER_LIST.COLS.COST] =
                isInternalSupplier
                    ? 0
                    : (Number.isFinite(numericPrice) && numericPrice > 0
                        ? Math.round(numericPrice)
                        : 0);
        }
    } else if (
        sanitized[ORDERS_SCHEMA.ORDER_LIST.COLS.COST] != null &&
        beforeSupplyId != null
    ) {
        // Đơn bán supply không đổi nhưng user update cost trực tiếp — nếu NCC
        // hiện tại là Mavryk/Shop thì ép cost = 0 (giữ rule cũ cho đơn bán nội bộ).
        const supRow = await trx(TABLES.supplier)
            .select(PARTNER_SCHEMA.SUPPLIER.COLS.SUPPLIER_NAME)
            .where(PARTNER_SCHEMA.SUPPLIER.COLS.ID, beforeSupplyId)
            .first();
        if (isMavrykShopSupplierName(supRow?.[PARTNER_SCHEMA.SUPPLIER.COLS.SUPPLIER_NAME])) {
            sanitized[ORDERS_SCHEMA.ORDER_LIST.COLS.COST] = 0;
        }
    }

    let updatedOrder;
    if (Object.keys(sanitized).length > 0) {
        const [row] = await trx(TABLES.orderList)
            .where({ id })
            .update(sanitized)
            .returning("*");
        updatedOrder = row;
    } else {
        updatedOrder = await trx(TABLES.orderList).where({ id }).first();
    }

    if (!updatedOrder) {
        return { notFound: true };
    }

    try {
        await updateDashboardMonthlySummaryOnStatusChange(trx, beforeOrder, updatedOrder);
        await syncMavnStoreProfitExpense(trx, beforeOrder, updatedOrder);

        const prevStatus = String(beforeOrder?.[COLS.ORDER.STATUS] ?? beforeOrder?.status ?? "").trim();
        const nextStatus = String(updatedOrder?.[COLS.ORDER.STATUS] ?? updatedOrder?.status ?? "").trim();
        const enteredRefundLifecycle =
            prevStatus !== STATUS.PENDING_REFUND &&
            prevStatus !== STATUS.REFUNDED &&
            (nextStatus === STATUS.PENDING_REFUND || nextStatus === STATUS.REFUNDED);
        if (enteredRefundLifecycle) {
            const { createOrGetRefundCreditNoteForOrder } = require("./finance/refundCredits");
            const refundAmount = Number(updatedOrder?.[COLS.ORDER.REFUND] ?? updatedOrder?.refund) || 0;
            if (refundAmount > 0) {
                await createOrGetRefundCreditNoteForOrder(trx, {
                    sourceOrderListId: updatedOrder?.[COLS.ORDER.ID] ?? updatedOrder?.id,
                    sourceOrderCode: updatedOrder?.[COLS.ORDER.ID_ORDER] ?? updatedOrder?.id_order,
                    customerName: updatedOrder?.[COLS.ORDER.CUSTOMER] ?? updatedOrder?.customer,
                    customerContact: updatedOrder?.[COLS.ORDER.CONTACT] ?? updatedOrder?.contact,
                    refundAmount,
                    note: `Tạo tự động khi đơn chuyển ${nextStatus}`,
                });
            }
        }
    } catch (debtErr) {
        logger.error("Lỗi cập nhật finance/dashboard sau khi sửa đơn", {
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
    if (supplierChangeResult) {
        normalized.supplier_change = supplierChangeResult;
    }
    return { updated: normalized };
};

module.exports = {
    updateOrderWithFinance,
};
