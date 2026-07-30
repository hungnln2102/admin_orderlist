// Register module-alias so we can require @/...
require('module-alias/register');

const { db } = require('@/db');
const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName, ORDERS_SCHEMA, SCHEMA_ORDERS } = require('@/config/dbSchema');

const SUPPLIER_ORDER_COST_LOG_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE, SCHEMA_PARTNER);
const PAYMENT_SUPPLY_TABLE = tableName(PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE, SCHEMA_PARTNER);
const SUPPLIER_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_PARTNER);

async function run() {
  try {
    console.log("=== DB QUERY START ===");
    
    // 1. Get all suppliers to find Member Ji and their IDs
    const suppliers = await db(SUPPLIER_TABLE).select('*');
    console.log("--- SUPPLIERS ---");
    console.table(suppliers.map(s => ({
      id: s.id,
      name: s.supplier_name,
      payment_account: s.payment_account,
      status: s.status
    })));

    // 2. Query orders cost log for supply_id = 13
    const unpaidSummary = await db(SUPPLIER_ORDER_COST_LOG_TABLE)
      .where({ supply_id: 13 })
      .select('id', 'order_list_id', 'import_cost', 'refund_amount', 'ncc_payment_status', 'logged_at')
      .orderBy('id', 'desc')
      .limit(10);
    console.log("--- COST LOG ENTRIES FOR SUPPLY 13 (LAST 10) ---");
    console.table(unpaidSummary);

    // 3. Query payment_supply table for supply_id = 13
    const paymentSupplies = await db(PAYMENT_SUPPLY_TABLE)
      .where({ supplier_id: 13 })
      .orderBy('id', 'desc');
    console.log("--- ALL PAYMENT SUPPLIES FOR SUPPLY 13 ---");
    console.table(paymentSupplies);
    
    const totalPaidSum = paymentSupplies.reduce((acc, p) => acc + Number(p.amount_paid), 0);
    console.log("Total Paid Sum from DB:", totalPaidSum);

    // 4. Query orders.order_list for supply_id = 13
    const orderListTable = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
    const orders = await db(orderListTable)
      .where({ supply_id: 13 })
      .select('id', 'id_order', 'cost', 'status', 'created_at')
      .orderBy('id', 'desc')
      .limit(10);
    console.log("--- LATEST ORDERS FOR SUPPLY 13 ---");
    console.table(orders);

  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    process.exit(0);
  }
}

run();
