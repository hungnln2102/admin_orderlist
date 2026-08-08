const path = require("path");
// Set up module alias or require using absolute path relative to current script
const backendRoot = path.resolve(__dirname, "../..");
require(path.join(backendRoot, "node_modules/module-alias/register"));

const { loadPostgresEnvForCli } = require(path.join(backendRoot, "src/config/loadPostgresEnvForCli"));
const knex = require("knex");

const DATABASE_URL = loadPostgresEnvForCli().trim();
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const db = knex({
  client: "pg",
  connection: DATABASE_URL,
});

async function run() {
  try {
    console.log(`Connecting to database URL: ${DATABASE_URL.replace(/:[^:@\n]+@/, ":****@")}`);
    console.log("Checking and creating business.payment_amount_suffix_seq...");
    await db.raw(`
      CREATE SEQUENCE IF NOT EXISTS business.payment_amount_suffix_seq
        START WITH 1
        INCREMENT BY 1
        MINVALUE 1
        MAXVALUE 100
        CYCLE;
    `);
    console.log("Sequence business.payment_amount_suffix_seq verified/created successfully!");
  } catch (err) {
    console.error("Error creating sequence:", err);
  } finally {
    await db.destroy();
  }
}

run();
