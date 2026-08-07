require('module-alias/register');
const { db } = require('../src/db');
const { ADMIN_SCHEMA, getDefinition, tableName, SCHEMA_ADMIN } = require('../src/config/dbSchema');

async function main() {
  try {
    const USERS_DEF = getDefinition("USERS", ADMIN_SCHEMA);
    const USERS_TABLE = tableName(USERS_DEF.tableName, SCHEMA_ADMIN);
    console.log("Querying table:", USERS_TABLE);
    const users = await db(USERS_TABLE).select('*');
    console.log("Users:", JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await db.destroy();
  }
}

main();
