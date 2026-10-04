require("dotenv").config();

module.exports = {
  development: {
    client: "pg",
    connection: process.env.DATABASE_URL || "postgresql://admin:ZAQ!xsw21122@127.0.0.1:5432/mydtbmav",
    searchPath: ["public", "orders", "admin", "partner", "product"],
    migrations: {
      directory: "./src/db/migrations",
      tableName: "knex_migrations_v2",
    },
  },
  production: {
    client: "pg",
    connection: process.env.DATABASE_URL,
    searchPath: ["public", "orders", "admin", "partner", "product"],
    migrations: {
      directory: "./src/db/migrations",
      tableName: "knex_migrations_v2",
    },
  },
};
