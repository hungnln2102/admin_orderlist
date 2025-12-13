const express = require("express");
const Helpers = require("../../helpers");
const sepayWebhookApp = require("../../webhook/sepay_webhook");
const { DB_SCHEMA, tableName, SCHEMA } = require("../config/dbSchema");
const {
    normalizeDateInput,
    toNullableNumber,
    normalizeCheckFlagValue,
    normalizeTextInput,
    todayYMDInVietnam,
    formatYMDToDMY,
} = require("../utils/normalizers");
const { getNextSupplyId } = require("../services/idService");
const { db } = require("../db");

// --- 1. CONFIG TABLES & CONSTANTS ---
const TABLES = {
    orderList: tableName(DB_SCHEMA.ORDER_LIST.TABLE),
    orderExpired: tableName(DB_SCHEMA.ORDER_EXPIRED.TABLE),
    orderCanceled: tableName(DB_SCHEMA.ORDER_CANCELED.TABLE),
    productPrice: tableName(DB_SCHEMA.PRODUCT_PRICE.TABLE),
    supply: tableName(DB_SCHEMA.SUPPLY.TABLE),
    packageProduct: tableName(DB_SCHEMA.PACKAGE_PRODUCT.TABLE),
    supplyPrice: tableName(DB_SCHEMA.SUPPLY_PRICE.TABLE),
};

const COLS = {
    ORDER: DB_SCHEMA.ORDER_LIST.COLS,
    PRICE: DB_SCHEMA.PRODUCT_PRICE.COLS,
    SUPPLY_PRICE: DB_SCHEMA.SUPPLY_PRICE.COLS,
    SUPPLY: DB_SCHEMA.SUPPLY.COLS,
};

// [NEW] Định nghĩa trạng thái chuẩn (Tiếng Việt có dấu)
const STATUS = {
    PAID: "Đã Thanh Toán",
    UNPAID: "Chưa Thanh Toán",
    EXPIRED: "Hết Hạn",
    RENEWAL: "Cần Gia Hạn",
    REFUNDED: "Đã Hoàn",
    PENDING_REFUND: "Chưa Hoàn"
};

const router = express.Router();

// --- 2. HELPERS ---

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

const normalizeOrderRow = (row, todayYmd = todayYMDInVietnam()) => {
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

    // [FIX] Lấy trực tiếp status từ DB, nếu null thì gán mặc định chuẩn
    const dbStatusRaw = row.status || STATUS.UNPAID;
    let autoStatus = dbStatusRaw;
    let autoCheckFlag = normalizeCheckFlagValue(row.check_flag);

    // [FIX] So sánh chuỗi chuẩn (Đã Thanh Toán)
    if (autoStatus !== STATUS.PAID && Number.isFinite(soNgayConLai)) {
        if (soNgayConLai <= 0) {
            autoStatus = STATUS.EXPIRED; // "Hết Hạn"
            autoCheckFlag = null;
        } else if (soNgayConLai <= 4) {
            autoStatus = STATUS.RENEWAL; // "Cần Gia Hạn"
            autoCheckFlag = null;
        }
    }

    if (autoStatus === STATUS.PAID && autoCheckFlag === null) {
        autoCheckFlag = true;
    }

    const dbCheckFlag = normalizeCheckFlagValue(row.check_flag);
    const finalCheckFlag = dbCheckFlag !== null ? dbCheckFlag : (autoCheckFlag || null);

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
        status: autoStatus, // Trả về status chuẩn
        status_auto: autoStatus,
        check_flag: finalCheckFlag,
        check_flag_auto: autoCheckFlag,
    };
};

const ORDER_WRITABLE_COLUMNS = [
    COLS.ORDER.ID_ORDER, COLS.ORDER.ID_PRODUCT, COLS.ORDER.INFORMATION_ORDER,
    COLS.ORDER.CUSTOMER, COLS.ORDER.CONTACT, COLS.ORDER.SLOT,
    COLS.ORDER.ORDER_DATE, COLS.ORDER.DAYS, COLS.ORDER.EXPIRED_DATE,
    COLS.ORDER.SUPPLY, COLS.ORDER.COST, COLS.ORDER.PRICE,
    COLS.ORDER.NOTE, COLS.ORDER.STATUS, COLS.ORDER.CHECK_FLAG
];

const sanitizeOrderWritePayload = (raw = {}) => {
    const sanitized = {};
    ORDER_WRITABLE_COLUMNS.forEach((col) => {
        if (raw[col] === undefined) return;

        let val = raw[col];
        if (col === COLS.ORDER.ORDER_DATE || col === COLS.ORDER.EXPIRED_DATE) {
            val = normalizeDateInput(val);
        } else if (col === COLS.ORDER.COST || col === COLS.ORDER.PRICE || col === COLS.ORDER.DAYS) {
            val = toNullableNumber(val);
        } else if (col === COLS.ORDER.CHECK_FLAG) {
            val = normalizeCheckFlagValue(val);
        } else if (typeof val === "string") {
            val = val.trim();
        }
        sanitized[col] = val;
    });
    return sanitized;
};

// --- 3. ROUTES ---

// GET /api/orders
router.get("/", async(req, res) => {
    const scope = (req.query.scope || "").toLowerCase();
    const table = scope === "expired" ? TABLES.orderExpired :
        (scope === "canceled" || scope === "cancelled") ? TABLES.orderCanceled :
        TABLES.orderList;

    console.log(`[GET] /api/orders scope=${scope}`);

    try {
        const rows = await db(table).select("*",
            db.raw("order_date::text as order_date_raw"),
            db.raw("order_expired::text as order_expired_raw")
        );
        const today = todayYMDInVietnam();
        const normalized = rows.map(r => normalizeOrderRow(r, today));
        res.json(normalized);
    } catch (error) {
        console.error("Query failed:", error);
        res.status(500).json({ error: "Unable to load order list." });
    }
});

router.get("/expired", (req, res) => res.redirect("/api/orders?scope=expired"));
router.get("/canceled", (req, res) => res.redirect("/api/orders?scope=canceled"));

// POST /renew
router.post("/:orderCode/renew", async(req, res) => {
    const { orderCode } = req.params;
    const forceRenewal = req.body?.forceRenewal ?? req.body?.force ?? true;

    if (!orderCode) return res.status(400).json({ error: "Missing order code." });

    try {
        const result = await sepayWebhookApp.runRenewal(orderCode, { forceRenewal });
        if (result?.success) {
            if (typeof sepayWebhookApp.sendRenewalNotification === "function") {
                sepayWebhookApp.sendRenewalNotification(orderCode, result).catch(console.error);
            }
            return res.json(result);
        }
        const status = result?.processType === "skipped" ? 409 : 400;
        return res.status(status).json({ error: result?.details || "Renewal failed", result });
    } catch (error) {
        console.error(`Renewal error (${orderCode}):`, error);
        return res.status(500).json({ error: "Unable to renew order." });
    }
});

// PATCH /refund
router.patch("/canceled/:id/refund", async(req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });

    try {
        // [FIX] Status chuẩn: "Đã Hoàn"
        const [updated] = await db(TABLES.orderCanceled)
            .where({ id })
            .update({ status: STATUS.REFUNDED, check_flag: false })
            .returning(["id", "id_order", "status", "check_flag"]);

        if (!updated) return res.status(404).json({ error: "Order not found" });
        res.json({ success: true, ...updated });
    } catch (error) {
        console.error("Refund error:", error);
        res.status(500).json({ error: "Unable to mark refunded." });
    }
});

// POST /calculate-price
router.post("/calculate-price", async(req, res) => {
    console.log("[POST] /api/calculate-price");
    const { supply_id, san_pham_name, id_product, id_order, customer_type } = req.body || {};

    const productName = String(san_pham_name || id_product || "").trim();
    const orderId = String(id_order || "").trim();

    if (!productName || !orderId) {
        return res.status(400).json({ error: "Missing info (productName/orderId)" });
    }

    try {
        const orderRow = await db(TABLES.orderList)
            .select("id_product", "price", "cost", "supply")
            .where({ id_order: orderId })
            .first();

        if (!orderRow) return res.status(404).json({ error: "Order not found" });

        let effectiveSupplyId = Number(supply_id);
        if (!effectiveSupplyId && orderRow.supply) {
            const s = await db(TABLES.supply).where({ source_name: orderRow.supply }).first();
            if (s) effectiveSupplyId = s.id;
        }
        if (!effectiveSupplyId && customer_type) {
            const s = await db(TABLES.supply).where({ source_name: customer_type }).first();
            if (s) effectiveSupplyId = s.id;
        }

        const searchKeys = [
            String(orderRow.id_product || ""),
            productName,
            productName.replace(/\s+/g, "")
        ].filter(Boolean);

        const productPricing = await db(TABLES.productPrice)
            .whereIn(COLS.PRICE.PRODUCT, searchKeys)
            .orWhereIn(COLS.PRICE.PACKAGE_PRODUCT, searchKeys)
            .orWhereIn(COLS.PRICE.PACKAGE, searchKeys)
            .first();

        if (!productPricing) {
            return res.status(400).json({ error: "Khong tim duoc bang gia." });
        }

        const supplyPriceRow = await db(TABLES.supplyPrice)
            .max(`${COLS.SUPPLY_PRICE.PRICE} as maxPrice`)
            .where(COLS.SUPPLY_PRICE.PRODUCT_ID, productPricing.id)
            .first();

        const baseImport = Number(supplyPriceRow?.maxPrice || 0);
        if (baseImport <= 0) {
            return res.status(400).json({ error: "Khong co gia supply (supply_price)." });
        }

        const pctCtv = Number(productPricing.pct_ctv) || 1;
        const pctKhach = Number(productPricing.pct_khach) || 1;
        const pctPromo = Number(productPricing.pct_promo) || 0;

        const prefixLe = (Helpers.ORDER_PREFIXES?.le || "LE").toUpperCase();
        const isLe = orderId.toUpperCase().startsWith(prefixLe) ||
            String(customer_type).toUpperCase() === prefixLe;

        let computedPrice = Helpers.roundGiaBanValue(baseImport * pctCtv);
        let computedPromo = null;

        if (isLe) {
            if (pctKhach <= 0) return res.status(400).json({ error: "Chua set pct_khach cho don Le" });
            computedPrice = Helpers.roundGiaBanValue(baseImport * pctCtv * pctKhach);
            if (pctKhach > pctPromo) {
                computedPromo = baseImport * pctCtv * (pctKhach - pctPromo);
            }
        }

        const round = (v) => Math.max(0, v % 1000 === 0 ? v : Math.round(v / 1000) * 1000);

        res.json({
            cost: round(baseImport),
            price: round(computedPrice),
            promoPrice: computedPromo ? round(Helpers.roundGiaBanValue(computedPromo)) : undefined,
            days: 30,
            order_expired: ""
        });

    } catch (error) {
        console.error(`Calculation error (${orderId}):`, error);
        res.status(500).json({ error: "System Error" });
    }
});

// POST /api/orders (Create)
router.post("/", async(req, res) => {
    console.log("[POST] /api/orders");
    const payload = sanitizeOrderWritePayload(req.body);
    delete payload.id;

    if (Object.keys(payload).length === 0) return res.status(400).json({ error: "Empty payload" });

    // [FIX] Default status chuẩn: "Chưa Thanh Toán"
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

    // [FIX] Check status chuẩn: "Đã Thanh Toán"
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

        // [FIX] So sánh thẳng với status trong DB ("Chưa Thanh Toán")
        const isHardDelete = normalized.status === STATUS.UNPAID && normalized.check_flag === null;

        if (isHardDelete) {
            await trx(TABLES.orderList).where({ id }).del();
            await trx.commit();
            return res.json({ success: true, movedTo: "deleted", deletedOrder: normalized });
        }

        const remaining = normalized.so_ngay_con_lai;
        const isExpired = remaining !== null && remaining < 4;
        const targetTable = isExpired ? TABLES.orderExpired : TABLES.orderCanceled;

        const archiveData = {...order };
        delete archiveData.id;

        if (isExpired) {
            archiveData.archived_at = new Date();
        } else {
            archiveData.refund = req.body.refund ? toNullableNumber(req.body.refund) : (toNullableNumber(order.price) || 0);
            // [FIX] Status chuẩn: "Chưa Hoàn"
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

// Supply Helper
const ensureSupplyRecord = async(sourceName) => {
    if (!sourceName) return null;
    const name = sourceName.trim();

    const exist = await db(TABLES.supply).where({ source_name: name }).first();
    if (exist) return exist.id;

    const nextId = await getNextSupplyId();
    const statusColRes = await db.raw(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'supply' AND column_name IN ('status', 'trang_thai', 'is_active') 
        LIMIT 1
    `);
    const statusCol = statusColRes.rows?.[0]?.column_name;

    const newSupply = { id: nextId, source_name: name };
    if (statusCol) newSupply[statusCol] = "active";

    await db(TABLES.supply).insert(newSupply);
    return nextId;
};

module.exports = router;
