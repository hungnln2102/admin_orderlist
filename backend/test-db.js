const { Client } = require("pg");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

async function testConnection() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log("Connected to Local DB");

    console.log("Querying order details for AR44 (case-insensitive)...");
    const orderRes = await client.query(`
      SELECT id, id_order, customer, contact, slot, order_date, cost, price, note, status, supply_id 
      FROM business.order_list 
      WHERE LOWER(id_order) = LOWER('ar44')
    `);
    console.log("Orders:", orderRes.rows);

    console.log("Querying payment_receipt table for notes/order codes containing ar44...");
    const receiptRes = await client.query(`
      SELECT id, id_order, payment_date, amount, receiver, sender, note, sepay_transaction_id, is_financial_posted, posted_revenue, posted_profit, posted_off_flow_bank_receipt 
      FROM billing.payment_receipt 
      WHERE LOWER(id_order) = LOWER('ar44') OR note LIKE '%ar44%' OR note LIKE '%AR44%'
    `);
    console.log("Receipts:", receiptRes.rows);

    if (receiptRes.rows.length > 0) {
      const receiptIds = receiptRes.rows.map((r) => r.id);
      console.log("Querying payment_receipt_financial_audit_log for receipt IDs:", receiptIds);
      const auditRes = await client.query(
        `
        SELECT * FROM billing.payment_receipt_financial_audit_log WHERE payment_receipt_id = ANY($1)
      `,
        [receiptIds]
      );
      console.log("Audit Logs:", auditRes.rows);
    }

    console.log("Querying ledger entries matching receipt or order code or containing ar44...");
    const ledgerRes = await client.query(`
      SELECT id, financial_account_id, entry_type, amount, signed_amount, balance_after, source_kind, source_id, note, created_at 
      FROM finance.financial_account_ledger 
      WHERE note LIKE '%ar44%' OR note LIKE '%AR44%' OR (source_kind = 'payment_receipt' AND source_id IN (
        SELECT id::text FROM billing.payment_receipt WHERE LOWER(id_order) = LOWER('ar44')
      ))
      ORDER BY id DESC
    `);
    console.log("Ledgers:", ledgerRes.rows);

    console.log("Querying financial change logs with context containing ar44 or similar...");
    const logRes = await client.query(`
      SELECT * FROM finance.dashboard_financial_change_log 
      WHERE context LIKE '%ar44%' OR context LIKE '%AR44%'
      ORDER BY id DESC
    `);
    console.log("Financial Change Logs:", logRes.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

testConnection().catch(console.error);
