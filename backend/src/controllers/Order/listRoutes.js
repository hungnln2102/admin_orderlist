const { db } = require("../../db");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { TABLES } = require("./constants");
const { normalizeOrderRow } = require("./helpers");

const attachListRoutes = (router) => {
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
};

module.exports = { attachListRoutes };
