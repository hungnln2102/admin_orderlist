#!/usr/bin/env node
/**
 * Chèn một tài khoản admin local khi `admin.users` đang rỗng (sau baseline).
 *
 *   set DEV_ADMIN_PASSWORD=matkhau && node scripts/ops/seed-dev-admin.js
 *
 * Hoặc PowerShell: $env:DEV_ADMIN_PASSWORD='matkhau'; node scripts/ops/seed-dev-admin.js
 */
require("../../src/config/loadEnv").loadBackendEnv();
const bcrypt = require("bcryptjs");
const knex = require("knex");
const { getPostgresConnectionUrl } = require("../../src/config/postgresConnectionUrl");

const username = (process.env.DEV_ADMIN_USERNAME || "mavryk").trim().toLowerCase();
const password = process.env.DEV_ADMIN_PASSWORD;
const role = process.env.DEV_ADMIN_ROLE || "Admin";

async function main() {
  if (!password || String(password).length < 6) {
    console.error(
      "Đặt DEV_ADMIN_PASSWORD (≥6 ký tự), ví dụ: DEV_ADMIN_PASSWORD=yourpass"
    );
    process.exit(1);
  }

  const db = knex({ client: "pg", connection: getPostgresConnectionUrl() });
  try {
    const { rows: cnt } = await db.raw(
      "select count(*)::int as n from admin.users"
    );
    if (cnt[0].n > 0) {
      console.log("admin.users đã có dữ liệu — bỏ qua seed.");
      return;
    }

    const hash = await bcrypt.hash(String(password), 10);
    await db("admin.users").insert({
      username,
      passwordhash: hash,
      role,
    });
    console.log(`Đã tạo user dev: ${username} (role=${role})`);
  } finally {
    await db.destroy();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
