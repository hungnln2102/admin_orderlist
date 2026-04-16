/**
 * Bundle migration for financial reconcile + refund normalization.
 *
 * This consolidates the following backend migration wrappers:
 * - 20260428120000_payment_receipt_financial_audit_log.js
 * - 20260429100000_supplier_order_cost_log_refund_note_only.js
 * - 20260429110000_refund_columns_force_positive.js
 * - 20260429111000_order_list_refund_force_positive.js
 * - 20260429113000_supplier_order_cost_log_refund_keep_cost_when_zero.js (reduced to 067 re-apply only)
 * - 20260429114000_fix_zero_import_when_no_refund.js
 */

const fs = require("fs");
const path = require("path");

const readSql = (filename) =>
  fs.readFileSync(
    path.join(__dirname, "..", "..", "database", "migrations", filename),
    "utf8"
  );

exports.up = async function up(knex) {
  const sql066 = readSql("066_payment_receipt_financial_audit_log.sql");
  const sql067 = readSql("067_supplier_order_cost_log_refund_note_only.sql");
  const sql068 = readSql("068_refund_columns_force_positive.sql");
  const sql069 = readSql("069_order_list_refund_force_positive.sql");
  const sql070 = readSql("070_fix_zero_import_when_no_refund.sql");

  // Consolidated execution for financial reconcile/refund rule pack.
  await knex.raw(sql066);
  await knex.raw(sql067);
  await knex.raw(sql068);
  await knex.raw(sql069);
  await knex.raw(sql070);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS orders.payment_receipt_financial_audit_log;
    DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_refund_note_only ON partner.supplier_order_cost_log;
    DROP FUNCTION IF EXISTS partner.fn_supplier_order_cost_log_refund_note_only();
    DROP TRIGGER IF EXISTS tr_order_list_refund_force_positive ON orders.order_list;
    DROP FUNCTION IF EXISTS orders.fn_order_list_refund_force_positive();
  `);
};
