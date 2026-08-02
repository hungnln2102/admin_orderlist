require('module-alias/register');
const { db } = require('@/db');
const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName } = require('@/config/dbSchema');

async function run() {
  try {
    const table = tableName(PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE, SCHEMA_PARTNER);
    console.log("Table name resolved:", table);
    const res = await db.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'supplier_payments' 
        AND table_schema = 'partner';
    `);
    console.log("Columns:", res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
run();
