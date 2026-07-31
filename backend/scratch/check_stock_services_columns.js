require('module-alias/register');
const { db } = require('@/db');

async function run() {
  try {
    const columns = await db.withSchema('warehouse').table('stock_services').columnInfo();
    console.log("=== Columns of warehouse.stock_services ===");
    console.log(Object.keys(columns));
    console.log(columns);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
