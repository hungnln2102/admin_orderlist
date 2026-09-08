const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env.local") });
const moduleAlias = require("module-alias");
moduleAlias.addAlias("@", path.join(__dirname, "..", "..", "src"));

const { db } = require("@/db");
const { TABLES, ruleCols } = require("@/domains/import-packages/constants");
const { SCHEMA_PRODUCT, tableName } = require("@/config/dbSchema");

async function main() {
  try {
    console.log("Tìm sản phẩm Youtube...");
    const products = await db(tableName("product", SCHEMA_PRODUCT))
      .select("id", "package_name")
      .whereILike("package_name", "%youtube%");

    if (!products || products.length === 0) {
      console.log("Không tìm thấy sản phẩm nào có tên chứa 'youtube'.");
      process.exit(0);
    }

    const now = new Date().toISOString();

    for (const prod of products) {
      console.log(`Đang cấu hình rule cho: ${prod.package_name} (ID: ${prod.id})`);
      
      const existing = await db(TABLES.rule)
        .where(ruleCols.productId, prod.id)
        .first();

      if (existing) {
        await db(TABLES.rule)
          .where(ruleCols.productId, prod.id)
          .update({
            [ruleCols.enabled]: true,
            [ruleCols.defaultSlotLimit]: 5,
            [ruleCols.defaultMatchMode]: "slot",
            [ruleCols.updatedAt]: now,
          });
        console.log(`-> Đã cập nhật rule hiện có (5 slot, match theo slot)`);
      } else {
        await db(TABLES.rule).insert({
          [ruleCols.productId]: prod.id,
          [ruleCols.enabled]: true,
          [ruleCols.fields]: JSON.stringify(["account", "password", "backup_email", "two_fa", "note"]),
          [ruleCols.defaultSlotLimit]: 5,
          [ruleCols.defaultMatchMode]: "slot",
          [ruleCols.createdAt]: now,
          [ruleCols.updatedAt]: now,
        });
        console.log(`-> Đã tạo mới rule (5 slot, match theo slot)`);
      }
    }
    
    console.log("Hoàn thành! Bạn có thể thử tạo lại đơn nhập hàng để kiểm tra.");
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    process.exit(0);
  }
}

main();
