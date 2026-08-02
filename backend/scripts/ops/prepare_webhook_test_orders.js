// Register module-alias so we can require @/...
require('module-alias/register');

const db = require('@/db/knexClient');

async function run() {
  try {
    console.log("=== PREPARE ORDERS START ===");

    // 1. Prepare MAVC3KB93: set to status 'Chưa Thanh Toán', supply_id = 17 (Kenny), cost = 150000
    const count1 = await db('orders.order_list')
      .where('id_order', 'MAVC3KB93')
      .update({
        status: 'Chưa Thanh Toán',
        supply_id: 17, // Kenny
        cost: 150000
      });
    console.log(`Updated ${count1} order(s) for MAVC3KB93`);

    // Clean up any old cost log for MAVC3KB93 if they exist
    const o1 = await db('orders.order_list').where('id_order', 'MAVC3KB93').first();
    if (o1) {
      const del1 = await db('partner.supplier_order_cost_log')
        .where('order_list_id', o1.id)
        .delete();
      console.log(`Deleted ${del1} existing supplier log(s) for MAVC3KB93`);
    }

    // 2. Prepare MVLVJU4J: set status to 'Cần Gia Hạn', supply_id = 17 (Kenny), cost = 120000
    const count2 = await db('orders.order_list')
      .where('id_order', 'MAVLVJU4J')
      .update({
        status: 'Cần Gia Hạn',
        supply_id: 17, // Kenny
        cost: 120000
      });
    console.log(`Updated ${count2} order(s) for MAVLVJU4J`);

    // Clean up any old cost log for MAVLVJU4J if they exist
    const o2 = await db('orders.order_list').where('id_order', 'MAVLVJU4J').first();
    if (o2) {
      const del2 = await db('partner.supplier_order_cost_log')
        .where('order_list_id', o2.id)
        .delete();
      console.log(`Deleted ${del2} existing supplier log(s) for MAVLVJU4J`);
    }

    console.log("=== PREPARE ORDERS DONE ===");

  } catch (err) {
    console.error("Error executing updates:", err);
  } finally {
    process.exit(0);
  }
}

run();
