const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Nạp .env từ v2/backend/.env trước, sau đó fallback sang backend/.env
const envPaths = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../backend/.env"),
  path.resolve(__dirname, "../../../.env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const PORT = process.env.PORT || 3002;
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.PG_URL ||
  "postgresql://postgres:postgres@localhost:5432/admin_store";

module.exports = {
  PORT,
  DATABASE_URL,
};
