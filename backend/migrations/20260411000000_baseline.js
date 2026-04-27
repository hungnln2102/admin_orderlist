/**
 * Baseline migration.
 *
 * Fresh database: bootstrap the consolidated schema from
 * database/migrations/000_full_schema.sql.
 *
 * Existing database: do nothing once the baseline schema is already present,
 * then let later incremental migrations run normally.
 */

const fs = require("fs");
const path = require("path");

const readMigrationSql = (filename) =>
  fs.readFileSync(
    path.join(__dirname, "..", "..", "database", "migrations", filename),
    "utf8"
  );

const freshBootstrapSqlFiles = [
  "000_full_schema.sql",
  "063_payment_receipt_sepay_dedupe.sql",
  "064_payment_receipt_drop_sub_account.sql",
  "065_payment_receipt_financial_state.sql",
  "066_payment_receipt_financial_audit_log.sql",
  "071_move_identity_and_audit_to_customer_web.sql",
  "072_move_customer_to_customer_info.sql",
  "073_move_receipt_tables_to_receipt_schema.sql",
  "074_move_reviews_to_product_schema.sql",
  "075_move_finance_to_dashboard_schema.sql",
  "076_move_tier_cycles_to_customer_web.sql",
  "077_merge_customer_info_into_customer_web.sql",
  "078_merge_key_active_into_system_automation.sql",
];

exports.up = async function up(knex) {
  const hasOrderSchema = await knex.raw(
    "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'orders'"
  );

  if (hasOrderSchema.rows.length) {
    return;
  }

  for (const filename of freshBootstrapSqlFiles) {
    await knex.raw(readMigrationSql(filename));
  }
};

exports.down = async function down() {
  // Baseline migration is intentionally not reversible.
};
