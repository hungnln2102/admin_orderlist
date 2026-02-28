/**
 * Script kiểm tra GET /api/input-list
 * Chạy: node scripts/test-input-list.js
 */
const http = require("http");

const options = {
  hostname: "localhost",
  port: 3001,
  path: "/api/form-info/inputs",
  method: "GET",
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Body:", body);
    if (res.statusCode === 401) {
      console.log("\n✓ Route OK (401 = cần đăng nhập, route tồn tại)");
    } else   if (res.statusCode === 404) {
      console.log("\n✗ Route KHÔNG tồn tại (404) - kiểm tra /api/form-info/inputs");
      process.exit(1);
    } else if (res.statusCode === 200) {
      console.log("\n✓ Route OK (200 = có session)");
    }
  });
});

req.on("error", (e) => {
  console.error("Error:", e.message);
  console.log("\nBackend có đang chạy? npm run dev");
  process.exit(1);
});

req.end();
