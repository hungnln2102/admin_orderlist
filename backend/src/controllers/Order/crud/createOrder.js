const { db } = require("../../../db");
const { TABLES, STATUS, COLS } = require("../constants");
const {
    normalizeOrderRow,
    sanitizeOrderWritePayload,
    ensureSupplyRecord,
    ensureSupplierCost,
    ensureVariantRecord,
    resolveProductToVariantId,
    normalizeTextInput,
} = require("../helpers");
const { todayYMDInVietnam } = require("../../../utils/normalizers");
const { ORDERS_SCHEMA, PARTNER_SCHEMA, PRODUCT_SCHEMA } = require("../../../config/dbSchema");
const { nextId } = require("../../../services/idService");
const { generateUniqueOrderCode, VALID_PREFIXES } = require("../../../services/orderCodeService");
const { sendOrderCreatedNotification } = require("../../../services/telegramOrderNotification");
const logger = require("../../../utils/logger");

const attachCreateOrderRoute = (router) => {
    router.post("/", async(req, res) => {
        logger.info("[POST] /api/orders");
        const payload = sanitizeOrderWritePayload(req.body);
        delete payload.id;

        if (Object.keys(payload).length === 0) return res.status(400).json({ error: "Empty payload" });

        payload.status = STATUS.UNPAID;
        const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
        const productIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;

        if (payload[productIdCol] == null && req.body?.variant_id != null) {
            const numericVariant = Number(req.body.variant_id);
            if (Number.isFinite(numericVariant) && numericVariant > 0) {
                payload[productIdCol] = numericVariant;
            }
        }

        const rawSupplyName = req.body?.supply ?? payload.supply;
        if (rawSupplyName != null && rawSupplyName !== "") {
            const name = normalizeTextInput(String(rawSupplyName));
            if (name) {
                const resolvedId = await ensureSupplyRecord(name);
                payload[supplyIdCol] = resolvedId;
            }
            delete payload.supply;
        } else if (
            req.body?.id_supply != null ||
            req.body?.supply_id != null ||
            payload.id_supply != null ||
            payload.supply_id != null
        ) {
            payload[supplyIdCol] = Number(
                req.body?.id_supply ??
                req.body?.supply_id ??
                payload.id_supply ??
                payload.supply_id
            ) || null;
        }

        const rawProduct = payload[productIdCol];
        if (rawProduct != null) {
            const variantId = await resolveProductToVariantId(rawProduct);
            if (variantId != null) {
                payload[productIdCol] = variantId;
            } else if (typeof rawProduct === "string") {
                const trimmed = rawProduct.trim();
                if (trimmed) {
                    const newVariantId = await ensureVariantRecord(trimmed);
                    payload[productIdCol] = newVariantId;
                } else {
                    payload[productIdCol] = null;
                }
            } else {
                payload[productIdCol] = Number(rawProduct) || null;
            }
        }

        const trx = await db.transaction();
        try {
            payload.id = await nextId(TABLES.orderList, COLS.ORDER.ID, trx);

            const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
            const clientIdOrder = String(payload[idOrderCol] || "").trim().toUpperCase();
            const detectedPrefix = VALID_PREFIXES.find((prefix) => clientIdOrder.startsWith(prefix)) || "MAVC";
            payload[idOrderCol] = await generateUniqueOrderCode(detectedPrefix, trx);

            const [newOrder] = await trx(TABLES.orderList).insert(payload).returning("*");

            await trx.commit();

            const resolvedVariantId = newOrder?.[productIdCol];
            const resolvedSupplyId = newOrder?.[supplyIdCol];
            const orderCost = Number(newOrder?.cost ?? payload.cost ?? 0);
            if (resolvedVariantId && resolvedSupplyId && orderCost > 0) {
                ensureSupplierCost(resolvedVariantId, resolvedSupplyId, orderCost).catch((error) => {
                    logger.error("[Order] Tạo supplier_cost thất bại", { error: error.message });
                });
            }

            const normalized = normalizeOrderRow(newOrder, todayYMDInVietnam());
            const supplyIdVal = newOrder?.[ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY];
            if (supplyIdVal != null) {
                const supplier = await db(TABLES.supplier)
                    .select(PARTNER_SCHEMA.SUPPLIER.COLS.SUPPLIER_NAME)
                    .where(PARTNER_SCHEMA.SUPPLIER.COLS.ID, supplyIdVal)
                    .first();
                normalized.supply = supplier?.[PARTNER_SCHEMA.SUPPLIER.COLS.SUPPLIER_NAME] ?? "";
            }

            const variantIdVal = newOrder?.[productIdCol];
            if (variantIdVal != null && Number.isFinite(Number(variantIdVal))) {
                const variant = await db(TABLES.variant)
                    .select(PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME, PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME)
                    .where(PRODUCT_SCHEMA.VARIANT.COLS.ID, variantIdVal)
                    .first();

                const displayName = variant?.[PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME]
                    ?? variant?.[PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME];

                normalized.variant_id = Number(variantIdVal);
                if (displayName != null) {
                    normalized.product_display_name = displayName;
                    normalized.id_product = displayName;
                }
            }

            res.status(201).json(normalized);
            sendOrderCreatedNotification(normalized).catch((error) => {
                logger.error("[Order][Telegram] Notify failed", { error: error.message, stack: error.stack });
            });
        } catch (error) {
            await trx.rollback();
            logger.error("Create order failed", { error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể tạo đơn hàng mới." });
        }
    });
};

module.exports = { attachCreateOrderRoute };
