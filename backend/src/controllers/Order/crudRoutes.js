const { db } = require("../../db");
const { TABLES, STATUS } = require("./constants");
const {
    normalizeOrderRow,
    sanitizeOrderWritePayload,
    ensureSupplyRecord,
    normalizeTextInput,
} = require("./helpers");
const { todayYMDInVietnam, toNullableNumber } = require("../../utils/normalizers");

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
            res.status(500).json({ error: "Unable to create order." });
        }
    });

    // PUT /api/orders/:id (Update)
    router.put("/:id", async(req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "Invalid ID" });

        const payload = sanitizeOrderWritePayload(req.body);
        delete payload.id;

        if (payload.status === STATUS.PAID && payload.check_flag === undefined) {
            payload.check_flag = true;
        }
        if (Object.keys(payload).length === 0) return res.status(400).json({ error: "No fields to update" });

        try {
            const [updatedOrder] = await db(TABLES.orderList)
                .where({ id })
                .update(payload)
                .returning("*");

            if (!updatedOrder) return res.status(404).json({ error: "Order not found" });

            const toISO = (d) => d ? d.toISOString().split('T')[0] : null;
            updatedOrder.order_date_raw = toISO(updatedOrder.order_date);
            updatedOrder.order_expired_raw = toISO(updatedOrder.order_expired);

            res.json(normalizeOrderRow(updatedOrder, todayYMDInVietnam()));
        } catch (error) {
            console.error("Update failed:", error);
            res.status(500).json({ error: "Unable to update order." });
        }
    });

    // DELETE /api/orders/:id
    router.delete("/:id", async(req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "Invalid ID" });

        const trx = await db.transaction();
        try {
            const order = await trx(TABLES.orderList).where({ id }).first();
            if (!order) {
                await trx.rollback();
                return res.status(404).json({ error: "Order not found" });
            }

            const normalized = normalizeOrderRow(order, todayYMDInVietnam());

            const isHardDelete = normalized.status === STATUS.UNPAID && normalized.check_flag === null;

            if (isHardDelete) {
                await trx(TABLES.orderList).where({ id }).del();
                await trx.commit();
                return res.json({ success: true, movedTo: "deleted", deletedOrder: normalized });
            }

            const remaining = normalized.so_ngay_con_lai;
            const isExpired = remaining !== null && remaining < 4;
            const targetTable = isExpired ? TABLES.orderExpired : TABLES.orderCanceled;

            const archiveData = { ...order };
            delete archiveData.id;

            if (isExpired) {
                archiveData.archived_at = new Date();
            } else {
                archiveData.refund = req.body.refund ? toNullableNumber(req.body.refund) : (toNullableNumber(order.price) || 0);
                archiveData.status = STATUS.PENDING_REFUND;
                archiveData.check_flag = false;
                archiveData.createdate = new Date();
            }

            await trx(targetTable).insert(archiveData);
            await trx(TABLES.orderList).where({ id }).del();

            await trx.commit();
            res.json({ success: true, movedTo: isExpired ? "expired" : "canceled", deletedOrder: normalized });

        } catch (error) {
            await trx.rollback();
            console.error("Delete failed:", error);
            res.status(500).json({ error: "Unable to delete order." });
        }
    });
};

module.exports = { attachCrudRoutes };
