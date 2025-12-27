const { db } = require("../../db");
const { TABLES, STATUS } = require("./constants");
const {
    normalizeOrderRow,
    sanitizeOrderWritePayload,
    ensureSupplyRecord,
    normalizeTextInput,
} = require("./helpers");
const { adjustSupplierDebtIfNeeded, calcRemainingRefund } = require("./orderFinanceHelpers");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { DB_SCHEMA } = require("../../config/dbSchema");
const { nextId } = require("../../services/idService");
const { deleteOrderWithArchive } = require("./orderDeletionService");
const { updateOrderWithFinance } = require("./orderUpdateService");
const ORDER_EXPIRED_COLS = Object.values(DB_SCHEMA.ORDER_EXPIRED.COLS || {});
const ORDER_CANCELED_COLS = Object.values(DB_SCHEMA.ORDER_CANCELED.COLS || {});
const ORDER_CANCELED_ALLOWED_COLS = ORDER_CANCELED_COLS.filter(
    (col) => col && col !== DB_SCHEMA.ORDER_CANCELED.COLS.NOTE
);
const ORDER_EXPIRED_ALLOWED_COLS = ORDER_EXPIRED_COLS.filter(Boolean);

const pruneArchiveData = (data, allowedCols) =>
    Object.fromEntries(Object.entries(data).filter(([key]) => allowedCols.includes(key)));

const attachCrudRoutes = (router) => {
    // POST /api/orders (Create)
    router.post("/", async(req, res) => {
        console.log("[POST] /api/orders");
        const payload = sanitizeOrderWritePayload(req.body);
        delete payload.id;

        if (Object.keys(payload).length === 0) return res.status(400).json({ error: "Empty payload" });

        payload.status = payload.status || STATUS.UNPAID;
        payload.check_flag = null;
        if (payload.supply) payload.supply = normalizeTextInput(payload.supply);

        const trx = await db.transaction();
        try {
            if (payload.supply) await ensureSupplyRecord(payload.supply);

            const [newOrder] = await trx(TABLES.orderList).insert(payload).returning("*");

            await trx.commit();
            res.status(201).json(normalizeOrderRow(newOrder, todayYMDInVietnam()));
        } catch (error) {
            await trx.rollback();
            console.error("Create failed:", error);
            res.status(500).json({ error: "Không thể tạo đơn hàng mới." });
        }
    });

    // PUT /api/orders/:id (Update)
    router.put("/:id", async (req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "ID khong hop le." });

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
                },
            });

            if (error) {
                await trx.rollback();
                return res.status(400).json({ error });
            }
            if (notFound) {
                await trx.rollback();
                return res.status(404).json({ error: "Khong tim thay don hang." });
            }

            await trx.commit();
            res.json(updated);
        } catch (error) {
            await trx.rollback();
            console.error("Loi cap nhat don hang:", error);
            res.status(500).json({ error: "Khong the cap nhat don hang." });
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
                    DB_SCHEMA,
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
            console.error("Lỗi xóa đơn hàng:", error);
            res.status(500).json({ error: "Không thể xóa đơn hàng." });
        }
    });

};

module.exports = { attachCrudRoutes };
