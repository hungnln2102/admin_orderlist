const { loadBackendEnv } = require("./src/config/loadEnv");
const { getPostgresConnectionUrl } = require("./src/config/postgresConnectionUrl");

loadBackendEnv();

const DATABASE_URL = getPostgresConnectionUrl().trim();
if (!DATABASE_URL) {
  console.error(
    "[knex] Không có chuỗi kết nối Postgres. Đặt DATABASE_URL (hoặc POSTGRES_URL / PG_URL), hoặc DB_USER + DB_NAME + DB_PASS/DB_PASSWORD, trong backend/.env / .env.docker / .env.local."
  );
  console.error(
    "  Hoặc: BACKEND_ENV_FILE=/đường/dẫn/.env npx knex migrate:latest"
  );
  process.exit(1);
}

module.exports = {
  development: {
    client: "pg",
    connection: DATABASE_URL,
    pool: { min: 0, max: 5 },
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
      schemaName: "public",
    },
    seeds: {
      directory: "./seeds",
    },
  },

  production: {
    client: "pg",
    connection: DATABASE_URL,
    pool: { min: 2, max: 10 },
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
      schemaName: "public",
    },
    seeds: {
      directory: "./seeds",
    },
  },
};
