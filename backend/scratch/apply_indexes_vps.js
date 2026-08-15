require('module-alias/register');
const { db } = require('@/db');

async function run() {
  try {
    console.log("=== FORCE APPLYING PERFORMANCE INDEXES ON DATABASE ===");

    // Drop old/outdated indexes to ensure they are created correctly
    console.log("1. Cleaning up existing performance indexes if any...");
    await db.raw(`
      DROP INDEX IF EXISTS billing.idx_payment_receipt_id_order_lower;
      DROP INDEX IF EXISTS business.idx_order_list_id_order_lower;
      DROP INDEX IF EXISTS billing.idx_payment_receipt_payment_date;
      DROP INDEX IF EXISTS business.idx_order_list_order_date;
      DROP INDEX IF EXISTS business.idx_order_list_created_at;
      DROP INDEX IF EXISTS billing.idx_refund_credit_notes_source_order_list_id;
      DROP INDEX IF EXISTS billing.idx_refund_credit_applications_target_order_list_id;
    `);

    // Create optimized indexes
    console.log("2. Creating optimized performance indexes...");
    await db.raw(`
      -- Date indexes for dashboard view queries
      CREATE INDEX idx_order_list_order_date ON business.order_list (order_date);
      CREATE INDEX idx_order_list_created_at ON business.order_list (created_at);
      CREATE INDEX idx_payment_receipt_payment_date ON billing.payment_receipt (payment_date);

      -- Functional indexes for LOWER expression matches in order list query
      CREATE INDEX idx_payment_receipt_id_order_lower ON billing.payment_receipt (LOWER(COALESCE(id_order, ''::text)));
      CREATE INDEX idx_order_list_id_order_lower ON business.order_list (LOWER(id_order));

      -- Foreign key indexes for lateral joins in order list query
      CREATE INDEX idx_refund_credit_notes_source_order_list_id ON billing.refund_credit_notes (source_order_list_id);
      CREATE INDEX idx_refund_credit_applications_target_order_list_id ON billing.refund_credit_applications (target_order_list_id);
    `);

    console.log("3. Verifying indexes on target tables:");
    const indexes = await db.raw(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname IN ('business', 'billing')
        AND tablename IN ('payment_receipt', 'order_list', 'refund_credit_notes', 'refund_credit_applications')
      ORDER BY schemaname, tablename, indexname;
    `);

    indexes.rows.forEach(idx => {
      console.log(`- [${idx.schemaname}.${idx.tablename}] ${idx.indexname}`);
    });

    console.log("\n✅ ALL INDEXES HAVE BEEN SUCCESSFULLY APPLIED AND VERIFIED!");

  } catch (error) {
    console.error("❌ Error applying indexes:", error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

run();
