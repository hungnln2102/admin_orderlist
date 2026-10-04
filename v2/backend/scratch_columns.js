require('dotenv').config();
const { db } = require('./src/db');

async function checkReceiptTables() {
  try {
    const res = await db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'receipt'");
    console.log("RECEIPT TABLES:", res.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkReceiptTables();
