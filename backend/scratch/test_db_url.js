const { loadBackendEnv } = require("../src/config/loadEnv");
const { getPostgresConnectionUrl } = require("../src/config/postgresConnectionUrl");

loadBackendEnv();

console.log("DATABASE_URL in env:", process.env.DATABASE_URL);
console.log("DB_PASS in env:", process.env.DB_PASS);
console.log("getPostgresConnectionUrl returns:", getPostgresConnectionUrl());
