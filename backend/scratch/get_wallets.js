require('module-alias/register');
const { db } = require('@/db');
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("@/config/dbSchema");

const WALLET_TYPES_TABLE = tableName(
  FINANCE_SCHEMA.MASTER_WALLETTYPES.TABLE,
  SCHEMA_FINANCE
);

async function run() {
  try {
    const wallets = await db(WALLET_TYPES_TABLE).select();
    console.log("Wallets:");
    console.log(JSON.stringify(wallets, null, 2));
  } catch (err) {
    console.error("Error querying wallets:", err.message);
  } finally {
    process.exit(0);
  }
}

run();
