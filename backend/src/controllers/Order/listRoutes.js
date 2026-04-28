const { todayYMDInVietnam } = require("../../utils/normalizers");
const { normalizeOrderRow } = require("./helpers");
const { buildOrdersListQuery } = require("./queries/listOrders");
const logger = require("../../utils/logger");

const TAX_ORDER_START_DATE = "2026-04-22";

const isValidYmd = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

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
                    enableAutoStatus: !(
                        scope === "canceled" ||
                        scope === "cancelled" ||
                        scope === "expired"
                    ),
                })
            );
            res.json(normalized);
        } catch (error) {
            logger.error("Truy Vấn Thất Bại", { scope, error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể tải danh sách đơn hàng." });
        }
    });

    // GET /api/orders/tax?from=2026-04-22
    router.get("/tax", async (req, res) => {
        const from = isValidYmd(req.query.from) ? String(req.query.from) : TAX_ORDER_START_DATE;

        logger.debug("[GET] /api/orders/tax", { from });

        try {
            const rows = await buildOrdersListQuery("tax", { from });

            const today = todayYMDInVietnam();
            const normalized = rows.map((row) =>
                normalizeOrderRow(row, today, { enableAutoStatus: true })
            );

            res.json(normalized);
        } catch (error) {
            logger.error("Truy vấn danh sách đơn tính thuế thất bại", {
                from,
                error: error.message,
                stack: error.stack,
            });
            res.status(500).json({ error: "Không thể tải danh sách đơn tính thuế." });
        }
    });

    router.get("/expired", (req, res) => res.redirect("/api/orders?scope=expired"));
    router.get("/canceled", (req, res) => res.redirect("/api/orders?scope=canceled"));
    router.get("/import", (req, res) => res.redirect("/api/orders?scope=import"));
    router.get("/mavn-expense", (req, res) =>
        res.redirect("/api/orders?scope=mavn_paid")
    );
};

module.exports = { attachListRoutes };



