const { todayYMDInVietnam } = require("../../utils/normalizers");
const { normalizeOrderRow } = require("./helpers");
const { buildOrdersListQuery } = require("./queries/listOrders");
const logger = require("../../utils/logger");

const attachListRoutes = (router) => {
    // GET /api/orders
    router.get("/", async(req, res) => {
        const scope = (req.query.scope || "").toLowerCase();

        logger.debug(`[GET] /api/orders`, { scope });

        try {
            const rows = await buildOrdersListQuery(scope);
            const today = todayYMDInVietnam();
            const normalized = rows.map((row) =>
                normalizeOrderRow(row, today, {
                    // Refund/canceled table should display the stored status from DB (e.g. Chưa Hoàn/Đã Hoàn)
                    // and must not be auto-overridden to Hết Hạn/Còn Gia Hạn based on expiry.
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



