/**
 * Canonical single definition for partner.fn_supplier_order_cost_log_on_success.
 * Does not replace the trigger (already on order_list). Documents rules in SQL comments.
 *
 * @see database/migrations/091_supplier_order_cost_log_fn_canonical.sql
 * Historical chain 039–089 unchanged; rollback reapplies 089 (function + trigger).
 */

const fs = require("fs");
const path = require("path");

exports.up = async function up(knex) {
  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "migrations",
    "091_supplier_order_cost_log_fn_canonical.sql"
  );
  await knex.raw(fs.readFileSync(sqlPath, "utf8"));
};

exports.down = async function down(knex) {
  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "legacy_sql_migrations",
    "089_fix_order_refund_text_coalesce_triggers.sql"
  );
  await knex.raw(fs.readFileSync(sqlPath, "utf8"));
};
