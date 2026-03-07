const { db } = require("../../db");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { TABLES } = require("./constants");
const { normalizeOrderRow } = require("./helpers");
const { ORDERS_SCHEMA, PARTNER_SCHEMA, PRODUCT_SCHEMA } = require("../../config/dbSchema");
const { STATUS } = require("../../utils/statuses");
const logger = require("../../utils/logger");

const idSupplyCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
const idProductCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;
const statusCol = ORDERS_SCHEMA.ORDER_LIST.COLS.STATUS;
const refundCol = ORDERS_SCHEMA.ORDER_LIST.COLS.REFUND;
const expiryCol = ORDERS_SCHEMA.ORDER_LIST.COLS.EXPIRY_DATE;
const supplierIdCol = PARTNER_SCHEMA.SUPPLIER.COLS.ID;
const supplierNameCol = "supplier_name"; // Cột tên NCC
const variantIdCol = PRODUCT_SCHEMA.VARIANT.COLS.ID;
const variantDisplayNameCol = PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME;

const attachListRoutes = (router) => {
    // GET /api/orders
    router.get("/", async(req, res) => {
        const scope = (req.query.scope || "").toLowerCase();
        const table = TABLES.orderList;

        logger.debug(`[GET] /api/orders`, { scope });

        try {
            let query = db(table)
                .leftJoin(TABLES.variant, `${table}.${idProductCol}`, `${TABLES.variant}.${variantIdCol}`)
                .leftJoin(TABLES.supplier, `${table}.${idSupplyCol}`, `${TABLES.supplier}.${supplierIdCol}`);

            if (scope === "expired") {
                query = query.where(statusCol, STATUS.EXPIRED);
            } else if (scope === "canceled" || scope === "cancelled") {
                query = query.where((q) =>
                    q.whereIn(statusCol, [STATUS.PENDING_REFUND, STATUS.REFUNDED]).orWhereNotNull(refundCol)
                );
            } else {
                query = query.whereNotIn(statusCol, [STATUS.EXPIRED, STATUS.PENDING_REFUND, STATUS.REFUNDED]);
            }

            const rows = await query.select(
                    `${table}.*`,
                    db.raw(`${table}.order_date::text as order_date_raw`),
                    db.raw(`${table}.${expiryCol}::text as expiry_date_raw`),
                    // id_product trong response luôn là display_name của variant nếu có,
                    // fallback sang giá trị gốc trong bảng orders.* (thường là variant_id).
                    db.raw(`COALESCE(${TABLES.variant}.${variantDisplayNameCol}::text, ${table}.${idProductCol}::text) as id_product`),
                    db.raw(`${TABLES.supplier}.${supplierNameCol}::text as supply`)
                );
            const today = todayYMDInVietnam();
            const normalized = rows.map((row) =>
                normalizeOrderRow(row, today, {
                    // Refund/canceled table should display the stored status from DB (e.g. ChÆ°a HoÃ n/ÄÃ£ HoÃ n)
                    // and must not be auto-overridden to Háº¿t Háº¡n/CÃ²n Gia Háº¡n based on expiry.
                    enableAutoStatus: !(scope === "canceled" || scope === "cancelled" || scope === "expired"),
                })
            );
            res.json(normalized);
        } catch (error) {
            logger.error("Truy Vấn Thất Bại", { scope, error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể tải danh sách đơn hàng." });
        }
    });

    router.get("/expired", (req, res) => res.redirect("/api/orders?scope=expired"));
    router.get("/canceled", (req, res) => res.redirect("/api/orders?scope=canceled"));
};

module.exports = { attachListRoutes };



