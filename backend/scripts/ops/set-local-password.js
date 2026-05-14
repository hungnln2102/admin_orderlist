#!/usr/bin/env node
/**
 * Đặt lại mật khẩu một user trong admin.users (bcrypt).
 *   node scripts/ops/set-local-password.js <username> <plain_password>
 */
require("../../src/config/loadEnv").loadBackendEnv();
const bcrypt = require("bcryptjs");
const knex = require("knex");
const { getPostgresConnectionUrl } = require("../../src/config/postgresConnectionUrl");

const username = (process.argv[2] || "").trim();
const password = process.argv[3];
const upsert = process.argv.includes("--upsert");

async function main() {
  if (!username || !password) {
    console.error(
      "Usage: node scripts/ops/set-local-password.js <username> <plain_password> [--upsert]"
    );
    process.exit(1);
  }

  const db = knex({ client: "pg", connection: getPostgresConnectionUrl() });
  try {
    const hash = await bcrypt.hash(String(password), 10);
    const n = await db("admin.users")
      .whereRaw("LOWER(username) = LOWER(?)", [username])
      .update({ passwordhash: hash });
    if (n === 0) {
      if (!upsert) {
        console.error(`Không tìm thấy user: ${username}`);
        process.exitCode = 1;
        return;
      }
      await db("admin.users").insert({
        username,
        passwordhash: hash,
        role: "admin",
      });
      console.log(`Đã tạo user và đặt mật khẩu: ${username}`);
      return;
    }
    console.log(`Đã cập nhật mật khẩu cho: ${username}`);
  } finally {
    await db.destroy();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
