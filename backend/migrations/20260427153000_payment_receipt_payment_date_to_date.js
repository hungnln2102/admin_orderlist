/**
 * @see database/migrations/066_payment_receipt_payment_date_to_date.sql
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
    "066_payment_receipt_payment_date_to_date.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    ALTER TABLE orders.payment_receipt
      ALTER COLUMN payment_date TYPE TEXT
      USING CASE
        WHEN payment_date IS NULL THEN NULL
        ELSE to_char(payment_date, 'YYYY-MM-DD')
      END;
  `);
};
