const { db } = require("../../src/db");
require("dotenv").config();

async function run() {
  try {
    const res = await db.raw(`
      SELECT relname, relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'business' AND c.relkind = 'S';
    `);
    console.log("Sequences in business schema:", res.rows);
  } catch (err) {
    console.error("Error probing sequences:", err);
  } finally {
    await db.destroy();
  }
}

run();
