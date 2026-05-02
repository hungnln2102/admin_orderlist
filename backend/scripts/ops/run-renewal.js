/**
 * Chạy gia hạn thủ công cho một đơn (vd. đơn chỉ mới đổi status chưa chạy renewal).
 * Chạy từ thư mục backend: node scripts/ops/run-renewal.js [ORDER_CODE]
 * Ví dụ: node scripts/ops/run-renewal.js MAVLSP7RH
 *
 * Env: `loadBackendEnv()` (backend/.env, .env.docker, .env.local hoặc BACKEND_ENV_FILE).
 * Nếu vẫn không có DATABASE_URL / DB_USER+DB_*: nạp thêm `scripts/.env` rồi `backend/.env` với override.
 * Hoặc: BACKEND_ENV_FILE=/đường/dẫn/.env node scripts/ops/run-renewal.js MAVCX...
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { loadBackendEnv } = require("../../src/config/loadEnv");
const { getPostgresConnectionUrl } = require("../../src/config/postgresConnectionUrl");

const logEnvDiag = (label, filePath, count) => {
  const exists = fs.existsSync(filePath);
  console.error(
    `[run-renewal] ${label}: ${filePath} (${exists ? "có file" : "không có"}${typeof count === "number" ? `, ${count} key` : ""})`
  );
};

loadBackendEnv();

const backendRoot = path.join(__dirname, "..", "..");
const scriptsEnvPath = path.resolve(path.join(__dirname, "..", ".env"));
const backendEnvPath = path.resolve(path.join(backendRoot, ".env"));

const tryLoadEnvFile = (absPath, override) => {
  if (!fs.existsSync(absPath)) return 0;
  const r = dotenv.config({ path: absPath, override: Boolean(override) });
  if (r.error) {
    console.error(`[run-renewal] Lỗi đọc .env: ${absPath} → ${r.error.message}`);
    return 0;
  }
  return r.parsed ? Object.keys(r.parsed).length : 0;
};

let url = String(getPostgresConnectionUrl() || "").trim();
if (!url) {
  const n = tryLoadEnvFile(scriptsEnvPath, true);
  logEnvDiag("Nạp scripts/.env (override)", scriptsEnvPath, n);
  url = String(getPostgresConnectionUrl() || "").trim();
}
if (!url) {
  const n = tryLoadEnvFile(backendEnvPath, true);
  logEnvDiag("Nạp backend/.env (override)", backendEnvPath, n);
  url = String(getPostgresConnectionUrl() || "").trim();
}

if (!url) {
  console.error(
    "[run-renewal] Không tìm thấy chuỗi kết nối Postgres sau khi nạp .env."
  );
  console.error(
    "  Cần một trong: DATABASE_URL | POSTGRES_URL | PG_URL | (DB_USER + DB_NAME + DB_PASS hoặc DB_PASSWORD)."
  );
  console.error(`  Đã thử: loadBackendEnv, ${scriptsEnvPath}, ${backendEnvPath}`);
  console.error(
    "  Hoặc chạy: BACKEND_ENV_FILE=/full/path/.env node scripts/ops/run-renewal.js MAVC..."
  );
  process.exit(1);
}

const orderCode = process.argv[2] || "MAVLSP7RH";
const { runRenewal } = require("../../webhook/sepay/renewal");

(async () => {
  console.log("Chạy gia hạn đơn:", orderCode, "(forceRenewal: true)\n");
  try {
    const result = await runRenewal(orderCode, { forceRenewal: true });
    console.log("Kết quả:", result?.success ? "OK" : "Lỗi/Bỏ qua");
    console.log(JSON.stringify(result, null, 2));
    process.exit(result?.success ? 0 : 1);
  } catch (err) {
    console.error("Lỗi:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
