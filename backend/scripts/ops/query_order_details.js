// Register module-alias so we can require @/...
require('module-alias/register');

const db = require('@/db/knexClient');

async function run() {
  try {
    console.log("=== DB QUERY START ===");

    // 1. Query details of MAVLVJU4J (Renewal-needed order)
    const renewalOrder = await db('orders.order_list')
      .where('id_order', 'MAVLVJU4J')
      .first();

    console.log("--- RENEWAL ORDER DETAILS ---");
    if (renewalOrder) {
      const supplier = renewalOrder.supply_id 
        ? await db('partner.supplier').where('id', renewalOrder.supply_id).first() 
        : null;
      console.log(JSON.stringify({
        id_order: renewalOrder.id_order,
        status: renewalOrder.status,
        price: renewalOrder.price, // Giá bán
        variant_id: renewalOrder.variant_id,
        supply_id: renewalOrder.supply_id,
        supplier_name: supplier ? supplier.supplier_name : null,
        slot: renewalOrder.slot,
        expired_at: renewalOrder.expired_at,
      }, null, 2));
    } else {
      console.log("Order MAVLVJU4J not found!");
    }

    // 2. Query supplier order cost logs for MAVC3KB93
    const paidOrder = await db('orders.order_list')
      .where('id_order', 'MAVC3KB93')
      .first();

    console.log("\n--- PAID ORDER DETAILS ---");
    if (paidOrder) {
      const supplier = paidOrder.supply_id 
        ? await db('partner.supplier').where('id', paidOrder.supply_id).first() 
        : null;
      console.log(JSON.stringify({
        id: paidOrder.id,
        id_order: paidOrder.id_order,
        status: paidOrder.status,
        price: paidOrder.price,
        supply_id: paidOrder.supply_id,
        supplier_name: supplier ? supplier.supplier_name : null,
      }, null, 2));
    }

    // Query all suppliers
    const suppliers = await db('partner.supplier');
    console.log("\n--- ALL SUPPLIERS ---");
    console.table(suppliers.map(s => ({ id: s.id, supplier_name: s.supplier_name })));

    // 3. Verify MAVCHH4YY (Credit order) exists or was deleted
    const creditOrder = await db('orders.order_list')
      .where('id_order', 'MAVCHH4YY')
      .first();
    console.log("\n--- CREDIT ORDER MAVCHH4YY ---");
    if (creditOrder) {
      console.log(JSON.stringify(creditOrder, null, 2));
    } else {
      console.log("Verified: Order MAVCHH4YY has been successfully deleted from the database!");
    }

    // 4. Verify Compound orders
    const compound1 = await db('orders.order_list').where('id_order', 'MAVLQD97T').first();
    const compound2 = await db('orders.order_list').where('id_order', 'MAVLB6DLP').first();
    console.log("\n--- COMPOUND ORDERS STATUS ---");
    console.log("MAVLQD97T:", compound1 ? compound1.status : "Not found");
    console.log("MAVLB6DLP:", compound2 ? compound2.status : "Not found");

  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    process.exit(0);
  }
}

run();
