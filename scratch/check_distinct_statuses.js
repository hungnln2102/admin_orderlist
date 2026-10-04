const { db } = require('E:/Project/admin_store/admin_orderlist/v2/backend/src/db');

async function checkStatuses() {
  try {
    const rows = await db('orders.order_list')
      .select('status')
      .count('id as count')
      .groupBy('status');
    console.log("Distinct statuses in DB:", rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkStatuses();
