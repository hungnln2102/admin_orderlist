const path = require("path");
const knex = require("knex");
const dotenv = require("dotenv");

// Always load env from backend root (so running from /src still works)
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const { SCHEMA } = require("../config/dbSchema");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.PG_URL ||
  "";

if (!DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "[db] Thiếu trường DATABASE_URL. Knex sẽ được khởi tạo mà không có chuỗi kết nối."
  );
}

const searchPath = [process.env.DB_SCHEMA || SCHEMA].filter(Boolean);

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
