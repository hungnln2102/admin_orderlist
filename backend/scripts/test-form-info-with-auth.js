/**
 * Test form-info endpoints với đăng nhập (admin/admin1)
 * Chạy: node scripts/test-form-info-with-auth.js
 */
const http = require("http");

const BASE = "http://localhost:3001";
const USERNAME = "admin";
const PASSWORD = "admin1";

function request(options, body) {
  return new Promise((resolve, reject) => {
    const path = options.path.startsWith("/") ? options.path : "/" + options.path;
    const url = new URL(BASE + path);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3001,
        path: url.pathname,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }
    );
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log("=== Test Form Info (có đăng nhập) ===\n");

  // 1. Login
  console.log("1. Đăng nhập...");
  const loginRes = await request({
    path: "/api/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  }, { username: USERNAME, password: PASSWORD });

  if (loginRes.status !== 200) {
    console.log("   ✗ Login thất bại:", loginRes.status, loginRes.body);
    process.exit(1);
  }
  console.log("   ✓ Login OK (200)");

  const setCookie = loginRes.headers["set-cookie"];
  if (!setCookie || !setCookie.length) {
    console.log("   ✗ Không có Set-Cookie trong response");
    process.exit(1);
  }
  // Chỉ gửi name=value, bỏ Path; HttpOnly; SameSite...
  const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
    .map((s) => String(s).split(";")[0].trim())
    .join("; ");

  // 2. GET /api/form-info/forms
  console.log("\n2. GET /api/form-info/forms...");
  const formsRes = await request({
    path: "/api/form-info/forms",
    method: "GET",
    headers: { Cookie: cookie },
  });
  console.log("   Status:", formsRes.status);
  if (formsRes.status === 200) {
    const data = JSON.parse(formsRes.body);
    const count = Array.isArray(data?.items) ? data.items.length : 0;
    console.log("   ✓ OK - Số form:", count);
  } else {
    console.log("   ✗ Lỗi:", formsRes.body);
  }

  // 3. GET /api/form-info/inputs
  console.log("\n3. GET /api/form-info/inputs...");
  const inputsRes = await request({
    path: "/api/form-info/inputs",
    method: "GET",
    headers: { Cookie: cookie },
  });
  console.log("   Status:", inputsRes.status);
  if (inputsRes.status === 200) {
    const data = JSON.parse(inputsRes.body);
    const count = Array.isArray(data?.items) ? data.items.length : 0;
    console.log("   ✓ OK - Số input:", count);
  } else {
    console.log("   ✗ Lỗi:", inputsRes.body);
  }

  console.log("\n=== Hoàn thành ===");
}

main().catch((e) => {
  console.error("Error:", e.message);
  console.log("\nBackend có đang chạy? npm run dev");
  process.exit(1);
});
