const { loadBackendEnv } = require("./src/config/loadEnv");
const { getPostgresConnectionUrl } = require("./src/config/postgresConnectionUrl");

loadBackendEnv();

const DATABASE_URL = getPostgresConnectionUrl();

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
