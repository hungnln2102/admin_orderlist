require("dotenv").config();
const knex = require("knex");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

const db = knex({
  client: "pg",
  connection: DATABASE_URL,
});

async function run() {
  try {
    console.log("Fetching all schemas in database...");
    const res = await db.raw(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND schema_name NOT LIKE 'pg_temp_%'
      AND schema_name NOT LIKE 'pg_toast_temp_%';
    `);

    const schemas = res.rows.map(row => row.schema_name);
    console.log("Schemas found:", schemas);

    for (const schema of schemas) {
      await db.raw(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      console.log(`Dropped schema: ${schema}`);
    }

    await db.raw("CREATE SCHEMA public");
    console.log("Created schema public successfully!");
  } catch (err) {
    console.error("Error resetting database:", err);
  } finally {
    await db.destroy();
  }
}

run();
