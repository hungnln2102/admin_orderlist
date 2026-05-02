/**
 * Chạy gia hạn thủ công cho một đơn (vd. đơn chỉ mới đổi status chưa chạy renewal).
 * Chạy từ thư mục backend: node scripts/ops/run-renewal.js [ORDER_CODE]
 * Ví dụ: node scripts/ops/run-renewal.js MAVLSP7RH
 *
 * Env: `loadBackendEnv()` (backend/.env, .env.docker, .env.local hoặc BACKEND_ENV_FILE).
 * Nếu vẫn không có DATABASE_URL / DB_USER+DB_*: nạp lần lượt (override) scripts/.env,
 * backend/.env, backend/.env.docker, backend/.env.local, repo-root .env.
 * Hoặc: BACKEND_ENV_FILE=/đường/dẫn/.env node scripts/ops/run-renewal.js MAVCX...
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { loadBackendEnv } = require("../../src/config/loadEnv");
const { getPostgresConnectionUrl } = require("../../src/config/postgresConnectionUrl");

const logEnvDiag = (label, filePath, count) => {
  const exists = fs.existsSync(filePath);
  const keys = exists && typeof count === "number" ? `, ${count} key` : "";
  console.error(
    `[run-renewal] ${label}: ${filePath} (${exists ? "có file" : "không có"}${keys})`
  );
};

loadBackendEnv();

const backendRoot = path.join(__dirname, "..", "..");
const repoRoot = path.resolve(backendRoot, "..");

/** Thứ tự fallback khi `loadBackendEnv()` chưa đủ (thường gặp: VPS chỉ có `.env.docker` hoặc `.env` nằm ở `admin_orderlist/`). */
const ENV_FALLBACKS = [
  ["scripts/.env", path.join(__dirname, "..", ".env")],
  ["backend/.env", path.join(backendRoot, ".env")],
  ["backend/.env.docker", path.join(backendRoot, ".env.docker")],
  ["backend/.env.local", path.join(backendRoot, ".env.local")],
  ["repo-root/.env (admin_orderlist/)", path.join(repoRoot, ".env")],
];

const STATIC_FALLBACK_PATHS = ENV_FALLBACKS.map(([label, p]) => [
  label,
  path.resolve(p),
]);

const tryLoadEnvFile = (absPath, override) => {
  if (!fs.existsSync(absPath)) return null;
  const r = dotenv.config({ path: absPath, override: Boolean(override) });
  if (r.error) {
    console.error(`[run-renewal] Lỗi đọc .env: ${absPath} → ${r.error.message}`);
    return null;
  }
  return r.parsed ? Object.keys(r.parsed).length : 0;
};

let url = String(getPostgresConnectionUrl() || "").trim();
if (!url) {
  for (const [label, absPath] of ENV_FALLBACKS) {
    const resolved = path.resolve(absPath);
    const n = tryLoadEnvFile(resolved, true);
    logEnvDiag(`Nạp ${label} (override)`, resolved, n ?? undefined);
    url = String(getPostgresConnectionUrl() || "").trim();
    if (url) break;
  }
}

if (!url) {
  console.error(
    "[run-renewal] Không tìm thấy chuỗi kết nối Postgres sau khi nạp .env."
  );
  console.error(
    "  Cần một trong: DATABASE_URL | POSTGRES_URL | PG_URL | (DB_USER + DB_NAME + DB_PASS hoặc DB_PASSWORD)."
  );
  console.error("  loadBackendEnv đã thử: backend/.env, rồi .env.docker (production) hoặc .env.local.");
  console.error("  Script còn thử các file sau (nếu tồn tại):");
  for (const [label, p] of STATIC_FALLBACK_PATHS) {
    console.error(`    - ${label}: ${p}`);
  }
  console.error(
    "  Trên server: tạo hoặc symlink một trong các file trên, hoặc chạy:"
  );
  console.error(
    "  BACKEND_ENV_FILE=/đường/dẫn/đến/file.env node scripts/ops/run-renewal.js MAVC..."
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
