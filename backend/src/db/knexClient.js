const path = require("path");
const knex = require("knex");
const dotenv = require("dotenv");

// Always load env from backend root (so running from /src still works)
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const {
  SCHEMA_ADMIN,
  SCHEMA_FINANCE,
  SCHEMA_IDENTITY,
  SCHEMA_ORDERS,
  SCHEMA_PARTNER,
  SCHEMA_PRODUCT,
  SCHEMA_PROMOTION,
  SCHEMA_SUPPLIER,
  SCHEMA_SUPPLIER_COST,
  SCHEMA_WALLET,
  SCHEMA_FORM_DESC,
} = require("../config/dbSchema");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.PG_URL ||
  "";

if (!DATABASE_URL) {
  // Use require here to avoid circular dependency
  try {
    const logger = require("../utils/logger");
    logger.warn(
      "[db] Thiếu trường DATABASE_URL. Knex sẽ được khởi tạo mà không có chuỗi kết nối."
    );
  } catch {
    // Fallback if logger not available
    console.warn(
      "[db] Thiếu trường DATABASE_URL. Knex sẽ được khởi tạo mà không có chuỗi kết nối."
    );
  }
}

const searchPath = Array.from(
  new Set(
    [
      SCHEMA_ORDERS,
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
    ].filter(Boolean)
  )
);

const db = knex({
  client: "pg",
  connection: DATABASE_URL,
  // Keep small pool to avoid exhausting server limits; tweak as needed.
  pool: {
    min: 0,
    max: Number(process.env.DB_POOL_MAX || 10),
  },
  searchPath,
});

module.exports = db;
