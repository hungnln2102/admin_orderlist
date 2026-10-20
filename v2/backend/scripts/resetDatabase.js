/**
 * resetDatabase.js
 * Script drop toàn bộ schema và bảng database hiện tại, sau đó chạy lại knex migrate để khởi tạo database rỗng mới hoàn toàn.
 */

require("module-alias/register");
const { db } = require("../src/db");
const path = require("path");

async function resetDatabase() {
  console.log("🧹 [ResetDB] Bắt đầu xóa sạch toàn bộ schemas và tables trong database...");

  try {
    // Drop schemas cascade
    const schemasToDrop = [
      "business",
      "billing",
      "finance",
      "warehouse",
      "system_automation",
      "admin",
      "receipt",
      "orders",
      "partner",
      "product",
      "identity",
      "promotion",
      "supplier",
      "supplier_cost",
      "wallet",
      "form_desc",
      "inputs",
      "renew_adobe"
    ];

    for (const schema of schemasToDrop) {
      await db.raw(`DROP SCHEMA IF EXISTS ?? CASCADE;`, [schema]);
      console.log(`🗑️ Đã drop schema: ${schema}`);
    }

    // Drop knex migration tables in public if exist
    await db.raw(`DROP TABLE IF EXISTS public.knex_migrations_v2 CASCADE;`);
    await db.raw(`DROP TABLE IF EXISTS public.knex_migrations_v2_lock CASCADE;`);
    await db.raw(`DROP TABLE IF EXISTS public.knex_migrations CASCADE;`);
    await db.raw(`DROP TABLE IF EXISTS public.knex_migrations_lock CASCADE;`);
    console.log(`🗑️ Đã xóa bảng knex_migrations trong public.`);

    console.log("✨ [ResetDB] Đã dọn dẹp sạch sẽ database. Đang tiến hành chạy knex migrate:latest...");

    // Run migrations with correct config
    const [batchNo, log] = await db.migrate.latest({
      directory: path.join(__dirname, "../src/db/migrations"),
      tableName: "knex_migrations_v2",
    });
    console.log(`✅ [ResetDB] Khởi tạo migration thành công! Batch: ${batchNo}`);
    console.log("📂 Các migration đã áp dụng:", log);

    console.log("🎉 [ResetDB] Hoàn tất khởi tạo database rỗng thành công!");
    process.exit(0);
  } catch (err) {
    console.error("❌ [ResetDB] Lỗi khi reset và khởi tạo database:", err);
    process.exit(1);
  }
}

resetDatabase();
