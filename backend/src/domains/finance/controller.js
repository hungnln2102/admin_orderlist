const { db } = require("@/db");
const logger = require("@/utils/logger");

async function getAllocations(req, res) {
    try {
        const { scope, from, to } = req.query;
        // We will mock the shape of OrderListRow but populate it from the Ledger
        // Scope can be 'mavn_paid' or 'tax'
        
        let query = db("admin_finance.financial_allocation_ledger as fal")
            .join("orders.order_list as ol", "fal.order_list_id", "ol.id")
            .leftJoin("product.variant as v", "ol.id_product", "v.id")
            .select(
                "fal.id", // The unique ID for the frontend grid (can be the ledger ID)
                "fal.order_list_id as original_order_id",
                "fal.id_order",
                "fal.registration_date",
                db.raw("fal.registration_date::text as registration_date_str"),
                db.raw("fal.registration_date::text as registration_date_display"),
                "fal.days",
                "fal.cost",
                "fal.price",
                "fal.created_at",
                db.raw("fal.created_at::text as created_at_raw"),
                "ol.information_order",
                "ol.customer",
                "ol.slot",
                "ol.id_product",
                db.raw("v.variant_name::text as variant_name"),
                db.raw("COALESCE(v.display_name::text, ol.id_product::text) as product_display_name"),
                db.raw("v.product_id::int as line_product_id")
            );

        if (scope === "mavn_paid" || scope === "mavn_expense") {
            query = query
                .where("ol.status", "Đã Thanh Toán")
                .whereRaw("fal.id_order::text ILIKE 'MAVN%'");
        } else if (scope === "tax") {
            query = query.where((qb) => {
                ["MAVC%", "MAVL%", "MAVK%", "MAVS%"].forEach((pattern) => {
                    qb.orWhereRaw("fal.id_order::text ILIKE ?", [pattern]);
                });
            });
        }
        
        if (from) {
            query = query.where("fal.registration_date", ">=", from);
        }
        if (to) {
            query = query.where("fal.registration_date", "<=", to);
        }

        query = query.orderBy("fal.registration_date", "asc").orderBy("fal.id", "asc");

        const results = await query;
        res.json(results);
    } catch (error) {
        logger.error("[FinanceController] Error fetching allocations", { error: error.message, stack: error.stack });
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    getAllocations,
};
