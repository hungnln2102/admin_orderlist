require("dotenv").config();
const knex = require("knex");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

const db = knex({
  client: "pg",
  connection: DATABASE_URL,
});

async function run() {
  try {
    // 1. Redefine the trigger function to point to business.product_keys
    console.log("Updating trigger function...");
    await db.raw(`
      CREATE OR REPLACE FUNCTION system_automation.sync_order_list_keys_after_order_update()
      RETURNS trigger AS $$
      BEGIN
        UPDATE business.product_keys k
        SET
          id_order = NEW.id_order,
          expires_at = NEW.expired_at,
          updated_at = NOW()
        WHERE k.order_list_id = NEW.id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log("Trigger function updated successfully!");

    // 2. Mark the pending migrations as completed by inserting them into knex_migrations
    console.log("Marking pending migrations as completed...");
    const migrations = [
      "20260806164837_rename_schemas_to_consolidated.js",
      "20260807000000_merge_and_optimize_schemas.js",
      "20260807002000_refactor_dashboard_change_log_to_narrow.js",
      "20260807003000_unify_financial_accounts.js",
      "20260807004000_convert_monthly_summary_to_view.js",
      "20260807005000_unify_product_keys.js",
      "20260807006000_rename_accounts_admin.js",
      "20261104000000_fix_dashboard_total_import_trigger_noop.js",
      "20261104000100_move_payment_amount_suffix_seq_to_business.js"
    ];

    // Find current max batch number
    const maxBatchRes = await db("knex_migrations").max("batch as max_batch").first();
    const nextBatch = (maxBatchRes.max_batch || 0) + 1;

    for (const m of migrations) {
      // Check if already exists (just in case)
      const existing = await db("knex_migrations").where({ name: m }).first();
      if (!existing) {
        await db("knex_migrations").insert({
          name: m,
          batch: nextBatch,
          migration_time: new Date()
        });
        console.log(`Marked ${m} as completed in batch ${nextBatch}`);
      }
    }
  } catch (err) {
    console.error("Error fixing DB state:", err);
  } finally {
    await db.destroy();
  }
}

run();
