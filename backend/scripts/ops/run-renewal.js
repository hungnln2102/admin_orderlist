/**
 * Chạy gia hạn thủ công cho một đơn (vd. đơn chỉ mới đổi status chưa chạy renewal).
 * Chạy từ thư mục backend: node scripts/ops/run-renewal.js [ORDER_CODE]
 * Ví dụ: node scripts/ops/run-renewal.js MAVLSP7RH
 *
 * Env: `loadPostgresEnvForCli()` — giống Knex (backend/.env, .env.docker, scripts/.env, v.v.).
 * Hoặc: BACKEND_ENV_FILE=/đường/dẫn/.env node scripts/ops/run-renewal.js MAVCX...
 */
const {
  loadPostgresEnvForCli,
  getPostgresCliFallbackPathsForHelp,
} = require("../../src/config/loadPostgresEnvForCli");

const url = loadPostgresEnvForCli();
if (!url) {
  console.error(
    "[run-renewal] Không tìm thấy chuỗi kết nối Postgres sau khi nạp .env."
  );
  console.error(
    "  Cần một trong: DATABASE_URL | POSTGRES_URL | PG_URL | (DB_USER + DB_NAME + DB_PASS hoặc DB_PASSWORD)."
  );
  console.error("  Đã thử loadBackendEnv và các file (nếu tồn tại):");
  for (const [label, p] of getPostgresCliFallbackPathsForHelp()) {
    console.error(`    - ${label}: ${p}`);
  }
  console.error(
    "  Hoặc: BACKEND_ENV_FILE=/đường/dẫn/đến/file.env node scripts/ops/run-renewal.js MAVC..."
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
