const path = require("path");
const dotenv = require("dotenv");

const backendRoot = path.join(__dirname, "..", "..");

/**
 * Nạp backend/.env rồi backend/.env.local (ghi đè) — dùng .env.local cho Postgres/Redis
 * trên máy dev, không sửa .env bản copy production.
 */
function loadBackendEnv() {
  dotenv.config({ path: path.join(backendRoot, ".env") });
  dotenv.config({ path: path.join(backendRoot, ".env.local"), override: true });
}

module.exports = { loadBackendEnv, backendRoot };
