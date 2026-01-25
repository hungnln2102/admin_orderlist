const { db } = require("../../db");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { TABLES } = require("./constants");
const { normalizeOrderRow } = require("./helpers");
const logger = require("../../utils/logger");

const attachListRoutes = (router) => {
    // GET /api/orders
    router.get("/", async(req, res) => {
        const scope = (req.query.scope || "").toLowerCase();
        const table = scope === "expired" ? TABLES.orderExpired :
            (scope === "canceled" || scope === "cancelled") ? TABLES.orderCanceled :
            TABLES.orderList;

        logger.debug(`[GET] /api/orders`, { scope });

        try {
            const rows = await db(table).select("*",
                db.raw("order_date::text as order_date_raw"),
                db.raw("order_expired::text as order_expired_raw")
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



