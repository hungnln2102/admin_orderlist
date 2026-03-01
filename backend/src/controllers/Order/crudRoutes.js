const { db } = require("../../db");
const { TABLES, STATUS, COLS } = require("./constants");
const {
    normalizeOrderRow,
    sanitizeOrderWritePayload,
    ensureSupplyRecord,
    resolveProductToVariantId,
    normalizeTextInput,
} = require("./helpers");
const { adjustSupplierDebtIfNeeded, calcRemainingRefund } = require("./orderFinanceHelpers");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { ORDERS_SCHEMA, PARTNER_SCHEMA, PRODUCT_SCHEMA } = require("../../config/dbSchema");
const { nextId } = require("../../services/idService");
const { deleteOrderWithArchive } = require("./orderDeletionService");
const { updateOrderWithFinance } = require("./orderUpdateService");
const { sendOrderCreatedNotification } = require("../../services/telegramOrderNotification");
const logger = require("../../utils/logger");
const ORDER_EXPIRED_COLS = Object.values(ORDERS_SCHEMA.ORDER_EXPIRED.COLS || {});
const ORDER_CANCELED_COLS = Object.values(ORDERS_SCHEMA.ORDER_CANCELED.COLS || {});
const ORDER_CANCELED_ALLOWED_COLS = ORDER_CANCELED_COLS.filter(
    (col) => col && col !== ORDERS_SCHEMA.ORDER_CANCELED.COLS.NOTE
);
const ORDER_EXPIRED_ALLOWED_COLS = ORDER_EXPIRED_COLS.filter(Boolean);

const pruneArchiveData = (data, allowedCols) =>
    Object.fromEntries(Object.entries(data).filter(([key]) => allowedCols.includes(key)));

const attachCrudRoutes = (router) => {
    // POST /api/orders (Create)
    router.post("/", async(req, res) => {
        logger.info("[POST] /api/orders");
        const payload = sanitizeOrderWritePayload(req.body);
        delete payload.id;

        if (Object.keys(payload).length === 0) return res.status(400).json({ error: "Empty payload" });

        payload.status = STATUS.UNPAID;
        const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
        const productIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;

        // Accept supply (name) or id_supply/supply_id (int): resolve name -> id
        if (payload.supply != null && payload.supply !== "") {
            const name = normalizeTextInput(String(payload.supply));
            if (name) {
                const resolvedId = await ensureSupplyRecord(name);
                payload[supplyIdCol] = resolvedId;
            }
            delete payload.supply;
        } else if (payload.id_supply != null || payload.supply_id != null) {
            payload[supplyIdCol] = Number(payload.id_supply ?? payload.supply_id) || null;
        }

        // Accept id_product as variant id (int) or product name (string): resolve name -> variant id
        const rawProduct = payload[productIdCol];
        if (rawProduct != null) {
            const variantId = await resolveProductToVariantId(rawProduct);
            if (variantId != null) {
                payload[productIdCol] = variantId;
            } else if (typeof rawProduct === "string") {
                payload[productIdCol] = rawProduct.trim() || null;
            } else {
                payload[productIdCol] = Number(rawProduct) || null;
            }
        }

        const trx = await db.transaction();
        try {
            // Ensure we always have a numeric PK because orders.order_list.id has no default/sequence
            payload.id = await nextId(TABLES.orderList, COLS.ORDER.ID, trx);

            const [newOrder] = await trx(TABLES.orderList).insert(payload).returning("*");

            await trx.commit();
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
                if (displayName != null) normalized.id_product = displayName;
            }
            res.status(201).json(normalized);
            sendOrderCreatedNotification(normalized).catch((err) => {
                logger.error("[Order][Telegram] Notify failed", { error: err.message, stack: err.stack });
            });
        } catch (error) {
            await trx.rollback();
            logger.error("Create order failed", { error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể tạo đơn hàng mới." });
        }
    });

    // PUT /api/orders/:id (Update)
    router.put("/:id", async (req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "ID không hợp lệ." });

        const trx = await db.transaction();
        try {
            const { updated, error, notFound } = await updateOrderWithFinance({
                trx,
                id,
                payload: req.body,
                helpers: {
                    TABLES,
                    STATUS,
                    sanitizeOrderWritePayload,
                    normalizeOrderRow,
                    todayYMDInVietnam,
                    ensureSupplyRecord,
                    normalizeTextInput,
                },
            });

            if (error) {
                await trx.rollback();
                return res.status(400).json({ error });
            }
            if (notFound) {
                await trx.rollback();
                return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
            }

            await trx.commit();
            res.json(updated);
        } catch (error) {
            await trx.rollback();
            logger.error("Lỗi cập nhật đơn hàng", { id, error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể cập nhật đơn hàng." });
        }
    });

        // DELETE /api/orders/:id
    router.delete("/:id", async (req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "ID không hợp lệ." });

        const trx = await db.transaction();
        try {
            const order = await trx(TABLES.orderList).where({ id }).first();
            if (!order) {
                await trx.rollback();
                return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
            }

            const normalized = normalizeOrderRow(order, todayYMDInVietnam());

            const result = await deleteOrderWithArchive({
                trx,
                order,
                normalized,
                reqBody: req.body,
                    helpers: {
                        TABLES,
                        ORDERS_SCHEMA,
                        STATUS,
                        nextId,
                        pruneArchiveData,
                        adjustSupplierDebtIfNeeded,
                        calcRemainingRefund,
                    allowedArchiveColsExpired: ORDER_EXPIRED_ALLOWED_COLS,
                    allowedArchiveColsCanceled: ORDER_CANCELED_ALLOWED_COLS,
                },
            });

            res.json(result);
        } catch (error) {
            await trx.rollback();
            logger.error("Lỗi xóa đơn hàng", { id, error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể xóa đơn hàng." });
        }
    });

};

module.exports = { attachCrudRoutes };
