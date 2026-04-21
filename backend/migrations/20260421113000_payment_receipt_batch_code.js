const fs = require("fs");
const path = require("path");

const readSql = (filename) =>
  fs.readFileSync(
    path.join(__dirname, "..", "..", "database", "migrations", filename),
    "utf8"
  );

exports.up = async function up(knex) {
  const sql = readSql("074_payment_receipt_batch_code.sql");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP TRIGGER IF EXISTS tr_touch_payment_receipt_batch_updated_at
      ON receipt.payment_receipt_batch;
    DROP FUNCTION IF EXISTS receipt.fn_touch_payment_receipt_batch_updated_at();
    DROP TABLE IF EXISTS receipt.payment_receipt_batch_item;
    DROP TABLE IF EXISTS receipt.payment_receipt_batch;
  `);
};
