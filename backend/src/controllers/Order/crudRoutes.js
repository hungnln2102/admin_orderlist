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
const { generateUniqueOrderCode, VALID_PREFIXES } = require("../../services/orderCodeService");
const { deleteOrderWithArchive } = require("./orderDeletionService");
const { updateOrderWithFinance } = require("./orderUpdateService");
const { sendOrderCreatedNotification } = require("../../services/telegramOrderNotification");
const logger = require("../../utils/logger");

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

        // Hỗ trợ variant_id mới: nếu client gửi variant_id mà payload chưa có id_product,
        // map variant_id sang cột id_product (variant_id).
        if (payload[productIdCol] == null && req.body?.variant_id != null) {
            const numericVariant = Number(req.body.variant_id);
            if (Number.isFinite(numericVariant) && numericVariant > 0) {
                payload[productIdCol] = numericVariant;
            }
        }

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
                const trimmed = rawProduct.trim();
                if (trimmed) {
                    return res.status(400).json({
                        error: "Sản phẩm không tồn tại trong hệ thống. Vui lòng chọn sản phẩm từ danh sách hoặc thêm sản phẩm mới trước khi tạo đơn.",
                    });
                }
                payload[productIdCol] = null;
            } else {
                payload[productIdCol] = Number(rawProduct) || null;
            }
        }

        const trx = await db.transaction();
        try {
            // Ensure we always have a numeric PK because orders.order_list.id has no default/sequence
            payload.id = await nextId(TABLES.orderList, COLS.ORDER.ID, trx);

            // Server-side order code: detect prefix from client id_order, then generate unique code
            const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
            const clientIdOrder = String(payload[idOrderCol] || "").trim().toUpperCase();
            const detectedPrefix = VALID_PREFIXES.find((p) => clientIdOrder.startsWith(p)) || "MAVC";
            payload[idOrderCol] = await generateUniqueOrderCode(detectedPrefix, trx);

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
                // variant_id luôn là ID variant (numeric)
                normalized.variant_id = Number(variantIdVal);
                if (displayName != null) {
                    // product_display_name là nhãn hiển thị mới
                    normalized.product_display_name = displayName;
                    // id_product giữ alias legacy để FE cũ không vỡ
                    normalized.id_product = displayName;
                }
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
                    resolveProductToVariantId,
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
                    adjustSupplierDebtIfNeeded,
                    calcRemainingRefund,
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
