require("dotenv").config();
const { Client } = require("pg");

async function resetDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database. Dropping V2 schemas and tables...");

    const schemas = ["business", "billing", "system_automation", "warehouse", "finance"];
    for (const schema of schemas) {
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
      console.log(`Dropped schema: ${schema}`);
    }

    await client.query(`DROP TABLE IF EXISTS knex_migrations_v2 CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS knex_migrations_v2_lock CASCADE;`);
    console.log(`Dropped migration tables.`);

    console.log("Database reset completed successfully.");
  } catch (err) {
    console.error("Error resetting database:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDb();
