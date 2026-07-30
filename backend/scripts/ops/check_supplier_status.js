// Register module-alias so we can require @/...
require('module-alias/register');

const db = require('@/db/knexClient');

async function run() {
  try {
    console.log("=== DB QUERY START ===");
    
    // Query negative amount receipts (outbound)
    const outboundReceipts = await db('receipt.payment_receipt')
      .where('amount', '<', 0)
      .orderBy('id', 'desc');

    console.log("--- OUTBOUND RECEIPTS ---");
    console.table(outboundReceipts.map(r => ({
      id: r.id,
      amount: r.amount,
      receiver: r.receiver,
      note: r.note,
      created_at: r.created_at
    })));

  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    process.exit(0);
  }
}

run();
