/**
 * Test form-info với supertest (agent giữ cookie tự động)
 * Chạy: node scripts/test-form-info-supertest.js
 */
const request = require("supertest");
const app = require("../src/app");

const USERNAME = "admin";
const PASSWORD = "admin1";

async function main() {
  console.log("=== Test Form Info (supertest + agent) ===\n");

  const agent = request.agent(app);

  // 1. Login
  console.log("1. Đăng nhập...");
  const loginRes = await agent
    .post("/api/auth/login")
    .send({ username: USERNAME, password: PASSWORD })
    .expect("Content-Type", /json/);

  if (loginRes.body.error) {
    console.log("   ✗ Login thất bại:", loginRes.body.error);
    process.exit(1);
  }
  console.log("   ✓ Login OK (200)");

  // 2. GET /api/form-info/forms
  console.log("\n2. GET /api/form-info/forms...");
  const formsRes = await agent.get("/api/form-info/forms");
  console.log("   Status:", formsRes.status);
  if (formsRes.status === 200) {
    const count = Array.isArray(formsRes.body?.items) ? formsRes.body.items.length : 0;
    console.log("   ✓ OK - Số form:", count);
  } else {
    console.log("   ✗ Lỗi:", formsRes.body?.error || formsRes.text);
  }

  // 3. GET /api/form-info/inputs
  console.log("\n3. GET /api/form-info/inputs...");
  const inputsRes = await agent.get("/api/form-info/inputs");
  console.log("   Status:", inputsRes.status);
  if (inputsRes.status === 200) {
    const count = Array.isArray(inputsRes.body?.items) ? inputsRes.body.items.length : 0;
    console.log("   ✓ OK - Số input:", count);
  } else {
    console.log("   ✗ Lỗi:", inputsRes.body?.error || inputsRes.text);
  }

  console.log("\n=== Hoàn thành ===");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
