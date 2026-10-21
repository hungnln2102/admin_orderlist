require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL là bắt buộc để chạy migration V2.");
}

module.exports = {
  development: {
    client: "pg",
    connection: process.env.DATABASE_URL,
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
