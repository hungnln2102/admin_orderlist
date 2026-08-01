require("module-alias/register");
const { pool } = require("@/config/database");

async function main() {
  try {
    const res = await pool.query(
      `SELECT name, migration_time FROM public.knex_migrations ORDER BY id DESC LIMIT 10`
    );
    console.log("=== APPLIED MIGRATIONS ===");
    console.log(res.rows);
  } catch (err) {
    console.error("Error running script:", err);
  } finally {
    await pool.end();
  }
}

main();
