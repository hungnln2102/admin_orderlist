require('module-alias/register');
const { db } = require('@/db');

async function run() {
  try {
    console.log("=== CHECKING INDEXES IN DATABASE ===");
    
    const indexes = await db.raw(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname IN ('business', 'billing')
        AND tablename IN ('payment_receipt', 'order_list', 'refund_credit_notes', 'refund_credit_applications')
      ORDER BY schemaname, tablename, indexname;
    `);

    console.log(`Found ${indexes.rows.length} indexes:`);
    indexes.rows.forEach(idx => {
      console.log(`- [${idx.schemaname}.${idx.tablename}] ${idx.indexname}: ${idx.indexdef}`);
    });

  } catch (error) {
    console.error("Error during check:", error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

run();
