// Register module-alias so we can require @/...
require('module-alias/register');

const db = require('@/db/knexClient');

async function run() {
  try {
    console.log("=== VERIFY WEBHOOK TEST RESULTS START ===");

    // 1. Check MAVC3KB93 (Paid order)
    const o1 = await db('orders.order_list')
      .where('id_order', 'MAVC3KB93')
      .first();

    console.log("\n--- ORDER MAVC3KB93 STATUS ---");
    if (o1) {
      console.log(JSON.stringify({
        id: o1.id,
        id_order: o1.id_order,
        status: o1.status,
        price: o1.price,
        supply_id: o1.supply_id
      }, null, 2));

      // Query cost log
      const logs1 = await db('partner.supplier_order_cost_log')
        .where('order_list_id', o1.id);
      
      console.log("--- SUPPLIER COST LOGS FOR MAVC3KB93 ---");
      console.table(logs1);
    } else {
      console.log("Order MAVC3KB93 not found!");
    }

    // 2. Check MAVLVJU4J (Renewal order)
    const o2 = await db('orders.order_list')
      .where('id_order', 'MAVLVJU4J')
      .first();

    console.log("\n--- ORDER MAVLVJU4J STATUS ---");
    if (o2) {
      console.log(JSON.stringify({
        id: o2.id,
        id_order: o2.id_order,
        status: o2.status,
        price: o2.price,
        supply_id: o2.supply_id,
        expired_at: o2.expired_at
      }, null, 2));

      // Query cost log
      const logs2 = await db('partner.supplier_order_cost_log')
        .where('order_list_id', o2.id);
      
      console.log("--- SUPPLIER COST LOGS FOR MAVLVJU4J ---");
      console.table(logs2);
    } else {
      console.log("Order MAVLVJU4J not found!");
    }

    console.log("\n=== VERIFY WEBHOOK TEST RESULTS DONE ===");

  } catch (err) {
    console.error("Error executing verification query:", err);
  } finally {
    process.exit(0);
  }
}

run();
