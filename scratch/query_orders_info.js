const { db } = require("./v2/backend/src/db");

const orderCodes = [
  "MAVKCA2HC",
  "MAVKHD2S5",
  "MAVK6G6K2",
  "MAVK7MN92",
  "MAVKPCV8A",
  "MAVK7M5CG",
  "MAVKG5GWK",
  "MAVK52ZRY",
  "MAVKRFT55",
  "MAVKGZ2HQ",
  "MAVKW88X7",
  "MAVKBD8RL",
  "MAVN954U5",
  "MAVKEJZM8",
  "MAVNLZUDR",
  "MAVK3AX6A"
];

async function queryOrders() {
  try {
    console.log("Querying database for order codes...");
    
    // Let's check tables in business or warehouse or orders
    // Let's search business.order_list or any table containing id_order or order_code
    for (const code of orderCodes) {
      // Search in business.order_list or similar
      const orders = await db.raw(`
        SELECT * FROM business.order_list WHERE id_order = ? OR id_order LIKE ?
      `, [code, `%${code}%`]);

      console.log(`=== Order: ${code} ===`);
      if (orders.rows && orders.rows.length > 0) {
        console.log(JSON.stringify(orders.rows, null, 2));
      } else {
        console.log("Not found in business.order_list. Searching other tables...");
        // Search legacy tables or warehouse accounts
        const accounts = await db.raw(`
          SELECT * FROM warehouse.accounts WHERE assigned_order_id = ? OR assigned_order_id LIKE ?
        `, [code, `%${code}%`]);
        if (accounts.rows && accounts.rows.length > 0) {
          console.log("Found in warehouse.accounts:", JSON.stringify(accounts.rows, null, 2));
        } else {
          console.log("Not found anywhere in DB.");
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error querying orders:", err);
    process.exit(1);
  }
}

queryOrders();
