require("dotenv").config();
const knex = require("knex");

const DATABASE_URL = process.env.DATABASE_URL;
const db = knex({
  client: "pg",
  connection: DATABASE_URL,
});

async function run() {
  try {
    const tables = await db.raw(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `);
    console.log("All tables:");
    console.table(tables.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

run();
