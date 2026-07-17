const { db } = require("@/db");
const { STATUS } = require("@/utils/statuses");
const logger = require("@/utils/logger");
const { TABLES, ORDER_COLS } = require("@/domains/payments/controller/shared/constants");

const listMatchableOrders = async (req, res) => {
  const limitParam = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 500)
    : 200;
  const q = String(req.query.q || "").trim().toUpperCase();

  try {
    let query = db({ o: TABLES.orderList })
      .select({
        id: `o.${ORDER_COLS.id}`,
        orderCode: `o.${ORDER_COLS.idOrder}`,
        transaction: `o.${ORDER_COLS.transaction}`,
        status: `o.${ORDER_COLS.status}`,
        customer: `o.${ORDER_COLS.customer}`,
        informationOrder: `o.${ORDER_COLS.informationOrder}`,
      })
      .whereIn(`o.${ORDER_COLS.status}`, [STATUS.UNPAID, STATUS.RENEWAL])
      .whereRaw(`COALESCE(TRIM(o.${ORDER_COLS.idOrder}::text), '') <> ''`)
      .orderBy([
        { column: `o.${ORDER_COLS.orderDate}`, order: "desc" },
        { column: `o.${ORDER_COLS.id}`, order: "desc" },
      ])
      .limit(limit);

    if (q) {
      query = query.whereRaw(
        `(
          COALESCE(o.${ORDER_COLS.idOrder}::text, '') ILIKE ?
          OR COALESCE(o.${ORDER_COLS.transaction}::text, '') ILIKE ?
          OR COALESCE(o.${ORDER_COLS.customer}::text, '') ILIKE ?
          OR COALESCE(o.${ORDER_COLS.informationOrder}::text, '') ILIKE ?
        )`,
        [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]
      );
    }

    const rows = await query;
    const orders = (rows || []).map((row) => ({
      id: Number(row.id) || 0,
      orderCode: String(row.orderCode || "").trim().toUpperCase(),
      transaction: String(row.transaction || "").trim().toUpperCase(),
      status: String(row.status || ""),
      customer: String(row.customer || ""),
      informationOrder: String(row.informationOrder || ""),
    }));

    res.json({ orders, count: orders.length, limit });
  } catch (error) {
    logger.error("[payments] Query failed (matchable-orders)", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tải danh sách đơn hàng để ghép biên nhận." });
  }
};

module.exports = { listMatchableOrders };
