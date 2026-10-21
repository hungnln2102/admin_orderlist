const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Nạp .env từ v2/backend/.env trước, sau đó fallback sang backend/.env và .env.local
const envPaths = [
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(__dirname, "../../.env"),
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
  process.env.PG_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL, POSTGRES_URL hoặc PG_URL là bắt buộc cho V2.");
}

module.exports = {
  PORT,
  DATABASE_URL,
};
