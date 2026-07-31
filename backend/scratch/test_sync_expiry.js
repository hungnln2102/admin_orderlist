require('module-alias/register');
const { loadPostgresEnvForCli } = require('@/config/loadPostgresEnvForCli');
const { Pool } = require('pg');
const { syncMavnStockExpiryAfterOrderRenewal } = require('@/services/mavnRenewalStockExpirySync');

async function run() {
  const pool = new Pool({ connectionString: loadPostgresEnvForCli() });
  const client = await pool.connect();
  try {
    console.log("=== Testing syncMavnStockExpiryAfterOrderRenewal ===");
    
    // Test date
    const testDate = new Date('2026-09-03T17:00:00.000Z');
    const result = await syncMavnStockExpiryAfterOrderRenewal(client, {
      orderCode: 'MAVNBJ82Q',
      newExpiryDate: testDate
    });

    console.log("\nSync Result:");
    console.log(JSON.stringify(result, null, 2));

    // Verify in database
    const { rows } = await client.query(
      "SELECT * FROM warehouse.stock_services WHERE id = 38"
    );
    console.log("\nUpdated stock service row in DB:");
    console.log(JSON.stringify(rows, null, 2));

  } catch (err) {
    console.error("Error during verification:", err);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

run();
