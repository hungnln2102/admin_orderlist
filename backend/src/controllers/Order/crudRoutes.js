const { db } = require("../../db");
const { TABLES, STATUS } = require("./constants");
const {
    normalizeOrderRow,
    sanitizeOrderWritePayload,
    ensureSupplyRecord,
    normalizeTextInput,
} = require("./helpers");
const { todayYMDInVietnam, toNullableNumber } = require("../../utils/normalizers");
const { DB_SCHEMA, tableName } = require("../../config/dbSchema");
const { nextId } = require("../../services/idService");

const ORDER_EXPIRED_COLS = Object.values(DB_SCHEMA.ORDER_EXPIRED.COLS || {});
const ORDER_CANCELED_COLS = Object.values(DB_SCHEMA.ORDER_CANCELED.COLS || {});
const ORDER_CANCELED_ALLOWED_COLS = ORDER_CANCELED_COLS.filter(
    (col) => col && col !== DB_SCHEMA.ORDER_CANCELED.COLS.NOTE
);
const ORDER_EXPIRED_ALLOWED_COLS = ORDER_EXPIRED_COLS.filter(Boolean);

const pruneArchiveData = (data, allowedCols) =>
    Object.fromEntries(Object.entries(data).filter(([key]) => allowedCols.includes(key)));

const PAYMENT_SUPPLY_TABLE = tableName(DB_SCHEMA.PAYMENT_SUPPLY.TABLE);
const findSupplyIdByName = async(trx, supplyNameRaw) => {
    const normalized = normalizeTextInput(supplyNameRaw);
    if (!normalized) return null;
    const row = await trx(TABLES.supply)
        .select(DB_SCHEMA.SUPPLY.COLS.ID)
        .whereRaw(`LOWER(TRIM("${DB_SCHEMA.SUPPLY.COLS.SOURCE_NAME}"::text)) = ?`, [normalized.toLowerCase()])
        .first();
    return row && row[DB_SCHEMA.SUPPLY.COLS.ID] !== undefined
        ? Number(row[DB_SCHEMA.SUPPLY.COLS.ID]) || null
        : null;
};

const decreaseSupplierDebt = async(trx, supplyId, amount, noteDate = new Date()) => {
    const costValue = toNullableNumber(amount);
    if (!supplyId || !costValue || costValue <= 0) return;

    const colId = DB_SCHEMA.PAYMENT_SUPPLY.COLS.ID;
    const colImport = DB_SCHEMA.PAYMENT_SUPPLY.COLS.IMPORT_VALUE;
    const colPaid = DB_SCHEMA.PAYMENT_SUPPLY.COLS.PAID;
    const colStatus = DB_SCHEMA.PAYMENT_SUPPLY.COLS.STATUS;
    const colSourceId = DB_SCHEMA.PAYMENT_SUPPLY.COLS.SOURCE_ID;
    const colRound = DB_SCHEMA.PAYMENT_SUPPLY.COLS.ROUND;

    const latestCycle = await trx(PAYMENT_SUPPLY_TABLE)
        .where(colSourceId, supplyId)
        .orderBy(colId, "desc")
        .first();

    const formatNote = () => {
        const dt = noteDate instanceof Date ? noteDate : new Date();
        const day = String(dt.getDate()).padStart(2, "0");
        const month = String(dt.getMonth() + 1).padStart(2, "0");
        const year = dt.getFullYear();
        return `${day}/${month}/${year}`;
    };

    if (latestCycle) {
        const currentImport = toNullableNumber(latestCycle[colImport]) || 0;
        const currentPaid = toNullableNumber(latestCycle[colPaid]) || 0;
        const nextImport = currentImport - costValue;
        const updatePayload = {
            [colImport]: nextImport,
            [colPaid]: currentPaid,
        };
        if (latestCycle[colStatus] !== undefined) {
            updatePayload[colStatus] = latestCycle[colStatus];
        }
        await trx(PAYMENT_SUPPLY_TABLE)
            .where(colId, latestCycle[colId])
            .update(updatePayload);
    } else {
        await trx(PAYMENT_SUPPLY_TABLE).insert({
            [colSourceId]: supplyId,
            [colImport]: -costValue,
            [colPaid]: 0,
            [colRound]: formatNote(),
            [colStatus]: STATUS.UNPAID,
        });
    }
};

const adjustSupplierDebtIfNeeded = async(trx, orderRow, normalized) => {
    const statusValue = String(
        orderRow?.status ||
        normalized?.status ||
        normalized?.status_auto ||
        ""
    ).trim();
    const checkFlagVal = orderRow?.check_flag ?? normalized?.check_flag;

    const isUnpaidCase = statusValue === STATUS.UNPAID && checkFlagVal === false;
    const isPaidCase = statusValue === STATUS.PAID && checkFlagVal === true;

    if (!isUnpaidCase && !isPaidCase) return;

    const supplyId = await findSupplyIdByName(trx, orderRow?.supply);
    if (!supplyId) return;

    if (isUnpaidCase) {
        await decreaseSupplierDebt(trx, supplyId, orderRow?.cost);
        return;
    }

    const remainingDays = toNullableNumber(normalized?.so_ngay_con_lai);
    const totalDays = toNullableNumber(orderRow?.days);
    const baseCost = toNullableNumber(orderRow?.cost);
    if (!baseCost || !remainingDays || remainingDays <= 0 || !totalDays || totalDays <= 0) return;

    const prorated = (baseCost * remainingDays) / totalDays;
    if (!Number.isFinite(prorated) || prorated <= 0) return;
    await decreaseSupplierDebt(trx, supplyId, prorated);
};

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
    router.put("/:id", async(req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "ID không hợp lệ." });

        const payload = sanitizeOrderWritePayload(req.body);
        delete payload.id;

        if (payload.status === STATUS.PAID && payload.check_flag === undefined) {
            payload.check_flag = true;
        }
        if (Object.keys(payload).length === 0) return res.status(400).json({ error: "Không có trường nào để cập nhật." });

        try {
            const [updatedOrder] = await db(TABLES.orderList)
                .where({ id })
                .update(payload)
                .returning("*");

            if (!updatedOrder) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });

            const toISO = (d) => d ? d.toISOString().split('T')[0] : null;
            updatedOrder.order_date_raw = toISO(updatedOrder.order_date);
            updatedOrder.order_expired_raw = toISO(updatedOrder.order_expired);

            res.json(normalizeOrderRow(updatedOrder, todayYMDInVietnam()));
        } catch (error) {
            console.error("Lỗi cập nhật đơn hàng:", error);
            res.status(500).json({ error: "Không thể cập nhật đơn hàng." });
        }
    });

    // DELETE /api/orders/:id
    router.delete("/:id", async(req, res) => {
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

            const isHardDelete = normalized.status === STATUS.UNPAID && normalized.check_flag === null;

            try {
                await adjustSupplierDebtIfNeeded(trx, order, normalized);
            } catch (debtErr) {
                console.log("Lỗi khi xóa đơn hàng:", {
                    id,
                    supply: order?.supply,
                    cost: order?.cost,
                    status: order?.status,
                    check_flag: order?.check_flag,
                    error: debtErr?.message || debtErr,
                });
            }

            if (isHardDelete) {
                await trx(TABLES.orderList).where({ id }).del();
                await trx.commit();
                return res.json({ success: true, movedTo: "deleted", deletedOrder: normalized });
            }

            const remaining = normalized.so_ngay_con_lai;
            const isExpired = remaining !== null && remaining < 4;
            const targetTable = isExpired ? TABLES.orderExpired : TABLES.orderCanceled;

            const archiveData = { ...order };
            const archiveIdCol = isExpired
                ? DB_SCHEMA.ORDER_EXPIRED.COLS.ID
                : DB_SCHEMA.ORDER_CANCELED.COLS.ID;
            if (!archiveData[archiveIdCol]) {
                archiveData[archiveIdCol] = await nextId(targetTable, archiveIdCol, trx);
            }

            if (isExpired) {
                archiveData[DB_SCHEMA.ORDER_EXPIRED.COLS.ARCHIVED_AT] = new Date();
            } else {
                const refundValue =
                    req.body.refund !== undefined
                        ? toNullableNumber(req.body.refund)
                        : toNullableNumber(order.price) || 0;
                archiveData[DB_SCHEMA.ORDER_CANCELED.COLS.REFUND] = refundValue;
                archiveData.status = STATUS.PENDING_REFUND;
                archiveData.check_flag = false;
                archiveData[DB_SCHEMA.ORDER_CANCELED.COLS.CREATED_AT] = new Date();
            }

            const allowedArchiveCols = isExpired
                ? ORDER_EXPIRED_ALLOWED_COLS
                : ORDER_CANCELED_ALLOWED_COLS;
            const preparedArchive = pruneArchiveData(archiveData, allowedArchiveCols);

            await trx(targetTable).insert(preparedArchive);
            await trx(TABLES.orderList).where({ id }).del();

            await trx.commit();
            res.json({ success: true, movedTo: isExpired ? "expired" : "canceled", deletedOrder: normalized });

        } catch (error) {
            await trx.rollback();
            console.error("Lỗi xóa đơn hàng:", error);
            res.status(500).json({ error: "Không thể xóa đơn hàng." });
        }
    });
};

module.exports = { attachCrudRoutes };
