require("module-alias/register");
const { pool, ORDER_TABLE, ORDER_COLS } = require("../webhook/sepay/config");

const codes = [
  "MAVCG5GWK", "MAVC7M5CG", "MAVCPCV8A", "MAVC7MN92", "MAVCHD2S5",
  "MAVCCA2HC", "MAVCX9MLR", "MAVCZSZKR", "MAVC8LNXQ", "MAVC88QFY",
  "MAVCTTVFT", "MAVCF3PDS", "MAVCTZHTY", "MAVCXYVH4", "MAVCFA9EF"
];

async function main() {
  console.log("Connecting to Database...");
  const client = await pool.connect();
  try {
    const { rows: orders } = await client.query(
      `SELECT id, id_order, status, supply_id, cost, id_product 
       FROM ${ORDER_TABLE} 
       WHERE UPPER(id_order) = ANY($1)`,
      [codes]
    );

    console.log(`\n=== FOUND ${orders.length} ORDERS IN order_list ===`);
    console.table(orders.map(o => ({
      id: o.id,
      id_order: o.id_order,
      status: o.status,
      supply_id: o.supply_id,
      cost: o.cost,
      id_product: o.id_product
    })));

    const { rows: logs } = await client.query(
      `SELECT id, order_list_id, id_order, supply_id, import_cost, ncc_payment_status 
       FROM business.supplier_order_cost_log 
       WHERE UPPER(id_order) = ANY($1)`,
      [codes]
    );

    console.log(`\n=== FOUND ${logs.length} ENTRIES IN supplier_order_cost_log ===`);
    console.table(logs);

  } catch (err) {
    console.error("Error debugging orders:", err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
