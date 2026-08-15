require('module-alias/register');
const { loadPostgresEnvForCli } = require('@/config/loadPostgresEnvForCli');
const { Pool } = require('pg');
const { db } = require('@/db');
const { syncStockExpiryForAccountAndPackage } = require('@/services/mavnRenewalStockExpirySync');
const { eventBus } = require('@/events');
const EVENTS = require('@/events/eventTypes');
const logger = require('@/utils/logger');

// Force register warehouse subscribers
const { registerWarehouseSubscribers } = require('@/events/subscribers/warehouseSubscriber');
registerWarehouseSubscribers();

async function run() {
  const pool = new Pool({ connectionString: loadPostgresEnvForCli() });
  const client = await pool.connect();

  try {
    console.log("=== VERIFYING EXPIRY SYNC FLOW ===");

    // 1. Find or mock a product, variant, and stock service
    const product = await db('business.product').first();
    if (!product) {
      console.error("No product found in database. Cannot run verification.");
      return;
    }
    console.log(`Using product: ${product.package_name} (ID: ${product.id})`);

    const variant = await db('business.variant').where('product_id', product.id).first();
    if (!variant) {
      console.error(`No variant found for product ID ${product.id}. Cannot run verification.`);
      return;
    }
    console.log(`Using variant: ${variant.display_name || variant.variant_name} (ID: ${variant.id})`);

    const testAccount = "test_sync_flow_999@example.com";

    // Clean up old test data if any
    await client.query("DELETE FROM business.order_list WHERE id_order LIKE 'MAVNTEST%'");
    await client.query("DELETE FROM warehouse.stock_services WHERE note = 'test_sync_flow'");
    await client.query("DELETE FROM business.product_keys WHERE account_username = $1", [testAccount]);

    // Create a product stock record
    const stockInsert = await client.query(
      "INSERT INTO business.product_keys (account_username, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id",
      [testAccount]
    );
    const stockId = stockInsert.rows[0].id;
    console.log(`Created product stock ID: ${stockId} for account: ${testAccount}`);

    // Create a product name record if it doesn't exist
    let nameId = null;
    const nameRes = await client.query(
      "SELECT id FROM warehouse.product_names WHERE product_id = $1 LIMIT 1",
      [product.id]
    );
    if (nameRes.rows.length > 0) {
      nameId = nameRes.rows[0].id;
    } else {
      const nameInsert = await client.query(
        "INSERT INTO warehouse.product_names (name, product_id, slot, match, created_at, updated_at) VALUES ($1, $2, 1, 'information_order', NOW(), NOW()) RETURNING id",
        [product.package_name || "Test Product", product.id]
      );
      nameId = nameInsert.rows[0].id;
    }
    console.log(`Using product name ID: ${nameId}`);

    // Create stock service record
    const srvInsert = await client.query(
      `INSERT INTO warehouse.stock_services (stock_id, name_id, expires_at, status, note, created_at, updated_at)
       VALUES ($1, $2, $3::date, 'AVAILABLE', 'test_sync_flow', NOW(), NOW()) RETURNING id`,
      [stockId, nameId, '2026-10-30']
    );
    const serviceId = srvInsert.rows[0].id;
    console.log(`Created stock service ID: ${serviceId} with expiry: 2026-10-30`);

    // Verify initial state
    let srvRow = (await client.query("SELECT TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at FROM warehouse.stock_services WHERE id = $1", [serviceId])).rows[0];
    console.log(`Initial stock service expiry: ${srvRow.expires_at || 'null'}`);

    // 2. Simulate Manual Creation of MAVN Order (without ticking save to warehouse)
    console.log("\n--- SIMULATING IMPORT ORDER CREATION ---");
    const orderDate = new Date();
    const expiryDate1 = new Date('2026-09-02T00:00:00.000Z');
    
    // Insert order record into database first
    const orderInsert = await client.query(
      `INSERT INTO business.order_list (id_order, id_product, information_order, expired_at, status, created_at)
       VALUES ('MAVNTEST01', $1, $2, $3::date, 'Đã Thanh Toán', NOW()) RETURNING *`,
      [variant.id, testAccount, expiryDate1]
    );
    const mockOrder = orderInsert.rows[0];
    console.log(`Inserted mock order MAVNTEST01 with expiry: 2026-09-02`);

    // Emit the IMPORT_ORDER_CREATED event
    eventBus.emit(EVENTS.IMPORT_ORDER_CREATED, mockOrder);

    // Wait a brief moment for async event listener to finish
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify stock service expiry updated
    srvRow = (await client.query("SELECT TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at FROM warehouse.stock_services WHERE id = $1", [serviceId])).rows[0];
    console.log(`After creation, stock service expiry: ${srvRow.expires_at || 'null'}`);
    if (srvRow.expires_at === '2026-09-02') {
      console.log("=> CREATION SYNC SUCCESS!");
    } else {
      console.error("=> CREATION SYNC FAILED!");
    }

    // 3. Simulate Updating the Order's Expiry Date
    console.log("\n--- SIMULATING ORDER UPDATE (NEW EXPIRY) ---");
    const expiryDate2 = new Date('2026-09-15T00:00:00.000Z');

    // Update order in database
    await client.query(
      "UPDATE business.order_list SET expired_at = $1::date WHERE id_order = 'MAVNTEST01'",
      [expiryDate2]
    );
    
    const updatedOrder = (await client.query("SELECT * FROM business.order_list WHERE id_order = 'MAVNTEST01'")).rows[0];
    
    // Emit the ORDER_UPDATED event
    eventBus.emit(EVENTS.ORDER_UPDATED, {
      order: updatedOrder,
      before: mockOrder,
      source: "orders.update"
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    srvRow = (await client.query("SELECT TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at FROM warehouse.stock_services WHERE id = $1", [serviceId])).rows[0];
    console.log(`After update, stock service expiry: ${srvRow.expires_at || 'null'}`);
    if (srvRow.expires_at === '2026-09-15') {
      console.log("=> UPDATE SYNC SUCCESS!");
    } else {
      console.error("=> UPDATE SYNC FAILED!");
    }

    // 4. Simulate Deleting the MAVN Order
    console.log("\n--- SIMULATING ORDER DELETION ---");
    
    // Delete order from database
    await client.query("DELETE FROM business.order_list WHERE id_order = 'MAVNTEST01'");

    // Emit the ORDER_DELETED event
    eventBus.emit(EVENTS.ORDER_DELETED, {
      order: updatedOrder,
      source: "orders.delete"
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    srvRow = (await client.query("SELECT TO_CHAR(expires_at, 'YYYY-MM-DD') AS expires_at FROM warehouse.stock_services WHERE id = $1", [serviceId])).rows[0];
    console.log(`After deletion, stock service expiry: ${srvRow.expires_at || 'null'}`);
    if (srvRow.expires_at === null) {
      console.log("=> DELETION SYNC SUCCESS!");
    } else {
      console.error("=> DELETION SYNC FAILED!");
    }

    // Clean up database
    console.log("\nCleaning up test data...");
    await client.query("DELETE FROM warehouse.stock_services WHERE id = $1", [serviceId]);
    await client.query("DELETE FROM business.product_keys WHERE id = $1", [stockId]);
    console.log("Cleanup complete!");

  } catch (err) {
    console.error("Error during verification:", err);
  } finally {
    client.release();
    await pool.end();
    db.destroy();
    process.exit(0);
  }
}

run();
