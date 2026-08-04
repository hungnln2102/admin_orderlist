// Scratch script to create admin_dev user
require('module-alias/register');
const bcrypt = require('bcryptjs');
const { db } = require('../src/db');
const { ADMIN_SCHEMA, getDefinition, tableName, SCHEMA_ADMIN } = require('../src/config/dbSchema');

async function main() {
  try {
    const USERS_DEF = getDefinition("USERS", ADMIN_SCHEMA);
    const USERS_TABLE = tableName(USERS_DEF.tableName, SCHEMA_ADMIN);
    const userCols = USERS_DEF.columns;
    
    const username = 'admin_dev';
    const password = 'admin';
    const normalizedUsername = username.toLowerCase();
    
    console.log("Checking if user exists in table:", USERS_TABLE);
    const existing = await db(USERS_TABLE)
      .whereRaw(`LOWER("${userCols.username}") = ?`, [normalizedUsername])
      .first();
      
    if (existing) {
      console.log("User admin_dev already exists. Updating password...");
      await db(USERS_TABLE)
        .whereRaw(`LOWER("${userCols.username}") = ?`, [normalizedUsername])
        .update({
          [userCols.password]: await bcrypt.hash(password, 10)
        });
      console.log("Password updated successfully.");
    } else {
      console.log("Creating user admin_dev...");
      await db(USERS_TABLE).insert({
        [userCols.username]: username,
        [userCols.password]: await bcrypt.hash(password, 10),
        [userCols.role]: "admin",
      });
      console.log("User admin_dev created successfully.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await db.destroy();
  }
}
main();
