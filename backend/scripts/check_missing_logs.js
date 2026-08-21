require("module-alias/register");
const { pool, ORDER_TABLE, ORDER_COLS } = require("../webhook/sepay/config");

async function main() {
  const client = await pool.connect();
  try {
    // 1. Check count of paid/processing orders
    const { rows: r1 } = await client.query(
      `SELECT status, count(*) FROM ${ORDER_TABLE} GROUP BY status`
    );
    console.log("Status distribution in order_list:", r1);

    // 2. Check count of log entries
    const { rows: r2 } = await client.query(
      `SELECT count(*) FROM business.supplier_order_cost_log`
    );
    console.log("Total entries in supplier_order_cost_log:", r2[0].count);

    // 3. Find any paid/processing order missing log
    const { rows: missing } = await client.query(`
      SELECT o.id, o.id_order, o.status, o.supply_id, o.id_product, o.price, o.cost
      FROM ${ORDER_TABLE} o
      LEFT JOIN business.supplier_order_cost_log l ON l.order_list_id = o.id
      WHERE o.status IN ('Đang Xử Lý', 'Đã Thanh Toán')
        AND l.id IS NULL
      LIMIT 10
    `);
    console.log("Sample missing log orders:", missing);

  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
