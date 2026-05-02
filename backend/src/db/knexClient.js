const knex = require("knex");
const { loadPostgresEnvForCli } = require("../config/loadPostgresEnvForCli");

const {
  SCHEMA_ADMIN,
  SCHEMA_FINANCE,
  SCHEMA_IDENTITY,
  SCHEMA_ORDERS,
  SCHEMA_RECEIPT,
  SCHEMA_PARTNER,
  SCHEMA_PRODUCT,
  SCHEMA_PROMOTION,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  SCHEMA_WALLET,
  SCHEMA_FORM_DESC,
  SCHEMA_INPUTS,
  SCHEMA_RENEW_ADOBE,
} = require("../config/dbSchema");

const DATABASE_URL = loadPostgresEnvForCli().trim();

if (!DATABASE_URL) {
  // Use require here to avoid circular dependency
  try {
    const logger = require("../utils/logger");
    logger.warn(
      "[db] Thiếu chuỗi kết nối Postgres (DATABASE_URL / POSTGRES_URL / PG_URL hoặc DB_USER+DB_NAME). Knex sẽ được khởi tạo không có connection string."
    );
  } catch {
    // Fallback if logger not available
    console.warn(
      "[db] Thiếu chuỗi kết nối Postgres (DATABASE_URL / POSTGRES_URL / PG_URL hoặc DB_USER+DB_NAME). Knex sẽ được khởi tạo không có connection string."
    );
  }
}

const searchPath = Array.from(
  new Set(
    [
      SCHEMA_ORDERS,
      SCHEMA_RECEIPT,
      SCHEMA_PRODUCT,
      SCHEMA_PARTNER,
      SCHEMA_ADMIN,
      SCHEMA_FINANCE,
      SCHEMA_SUPPLIER,
      SCHEMA_SUPPLIER_COST,
      SCHEMA_IDENTITY,
      SCHEMA_PROMOTION,
      SCHEMA_WALLET,
      SCHEMA_FORM_DESC,
      SCHEMA_INPUTS,
      SCHEMA_RENEW_ADOBE, // system_automation (accounts_admin, gf_*, product_system, …)
    ].filter(Boolean)
  )
);

const KNEX_POOL_MAX = Number(process.env.DB_KNEX_POOL_MAX) || 10;

const db = knex({
  client: "pg",
  connection: DATABASE_URL,
  pool: {
    min: 0,
    max: KNEX_POOL_MAX,
    idleTimeoutMillis: 30_000,
  },
  searchPath,
});

db.raw("SELECT 1")
  .then(() =>
    console.log(`✅ Knex pool sẵn sàng (max=${KNEX_POOL_MAX})`)
  )
  .catch((err) => {
    console.error("❌ Knex kết nối thất bại:", err.message);
    if (process.env.NODE_ENV === "production") process.exit(1);
  });

module.exports = db;
