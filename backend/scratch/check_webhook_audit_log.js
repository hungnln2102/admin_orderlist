// Register module-alias so we can require @/...
require('module-alias/register');

const { db } = require('@/db');
const { RECEIPT_SCHEMA, SCHEMA_RECEIPT, tableName } = require('@/config/dbSchema');

const PAYMENT_RECEIPT_TABLE = tableName(RECEIPT_SCHEMA.PAYMENT_RECEIPT.TABLE, SCHEMA_RECEIPT);
const AUDIT_LOG_TABLE = tableName(RECEIPT_SCHEMA.PAYMENT_RECEIPT_FINANCIAL_AUDIT_LOG.TABLE, SCHEMA_RECEIPT);

async function run() {
  try {
    console.log("=== WEBHOOK AUDIT LOG START ===");

    // 1. Search for order / batch / supplier related to code D2V565T4
    const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName, ORDERS_SCHEMA, SCHEMA_ORDERS } = require('@/config/dbSchema');
    const orderListTable = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
    const paymentSupplyTable = tableName(PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE, SCHEMA_PARTNER);

    const orders = await db(orderListTable)
      .where('id_order', 'like', '%D2V565T4%')
      .orWhere('transaction', 'like', '%D2V565T4%');
    console.log("--- ORDERS MATCHING D2V565T4 ---");
    console.log(JSON.stringify(orders, null, 2));

    const paymentSupplies = await db(paymentSupplyTable)
      .where('payment_period', 'like', '%D2V565T4%');
    console.log("--- PAYMENT SUPPLIES MATCHING D2V565T4 ---");
    console.log(JSON.stringify(paymentSupplies, null, 2));
      console.log("--- AUDIT LOGS FOR LATEST RECEIPTS ---");

    // 3. Search specifically for supplier related logs in all audit logs
    const supplierLogs = await db(AUDIT_LOG_TABLE)
      .where('rule_branch', 'like', '%SUPPLIER%')
      .orWhere('rule_branch', 'like', '%OUTBOUND%')
      .orderBy('id', 'desc')
      .limit(15);
    console.log("\n--- RECENT SUPPLIER / OUTBOUND AUDIT LOGS ---");
    supplierLogs.forEach(log => {
      console.log(`\nLog ID: ${log.id} | Receipt ID: ${log.payment_receipt_id} | Rule Branch: ${log.rule_branch} | Created At: ${log.created_at}`);
      console.log("Delta:", JSON.stringify(log.delta, null, 2));
    });

  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    process.exit(0);
  }
}

run();
