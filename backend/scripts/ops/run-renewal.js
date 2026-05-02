/**
 * Chạy gia hạn thủ công cho một đơn (vd. đơn chỉ mới đổi status chưa chạy renewal).
 * Chạy từ thư mục backend: node scripts/ops/run-renewal.js [ORDER_CODE]
 * Ví dụ: node scripts/ops/run-renewal.js MAVLSP7RH
 *
 * Biến môi trường: dùng cùng thứ tự với app (`loadBackendEnv`: backend/.env, .env.docker, .env.local).
 * Nhiều VPS chỉ có `scripts/.env` — file đó được nạp thêm (không override biến đã có).
 * Hoặc: BACKEND_ENV_FILE=/đường/dẫn/.env node scripts/ops/run-renewal.js MAVCX...
 */
const path = require("path");
const { loadBackendEnv } = require("../../src/config/loadEnv");

loadBackendEnv();
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  override: false,
});

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
