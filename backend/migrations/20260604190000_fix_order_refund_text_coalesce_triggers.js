/**
 * Fix order delete/cancel updates when orders.order_list.refund is text.
 * @see database/migrations/089_fix_order_refund_text_coalesce_triggers.sql
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
    "089_fix_order_refund_text_coalesce_triggers.sql"
  );
  await knex.raw(fs.readFileSync(sqlPath, "utf8"));
};

exports.down = async function down(knex) {
  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "migrations",
    "087_mavn_preserve_logged_at_on_cost_update.sql"
  );
  await knex.raw(fs.readFileSync(sqlPath, "utf8"));
};
