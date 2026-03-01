const { db } = require("../../db");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { TABLES } = require("./constants");
const { normalizeOrderRow } = require("./helpers");
const { ORDERS_SCHEMA, PARTNER_SCHEMA, PRODUCT_SCHEMA } = require("../../config/dbSchema");
const logger = require("../../utils/logger");

const idSupplyCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
const idProductCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;
const supplierIdCol = PARTNER_SCHEMA.SUPPLIER.COLS.ID;
const supplierNameCol = "supplier_name"; // Cột tên NCC
const variantIdCol = PRODUCT_SCHEMA.VARIANT.COLS.ID;
const variantNameCol = PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME;

const attachListRoutes = (router) => {
    // GET /api/orders
    router.get("/", async(req, res) => {
        const scope = (req.query.scope || "").toLowerCase();
        const table = scope === "expired" ? TABLES.orderExpired :
            (scope === "canceled" || scope === "cancelled") ? TABLES.orderCanceled :
            TABLES.orderList;

        logger.debug(`[GET] /api/orders`, { scope });

        try {
            // Cả 3 bảng order_list, order_expired, order_canceled đều có supply_id
            const rows = await db(table)
                .leftJoin(TABLES.variant, `${table}.${idProductCol}`, `${TABLES.variant}.${variantIdCol}`)
                .leftJoin(TABLES.supplier, `${table}.${idSupplyCol}`, `${TABLES.supplier}.${supplierIdCol}`)
                .select(
                    `${table}.*`,
                    db.raw(`${table}.order_date::text as order_date_raw`),
                    db.raw(`${table}.order_expired::text as order_expired_raw`),
                    db.raw(`COALESCE(${TABLES.variant}.${variantNameCol}::text, ${table}.${idProductCol}::text) as id_product`),
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



