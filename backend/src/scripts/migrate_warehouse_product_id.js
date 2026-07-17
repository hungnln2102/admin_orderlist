require("module-alias/register");
const { db } = require("../db");
const { getDefinition, PRODUCT_SCHEMA, SCHEMA_PRODUCT, tableName } = require("../config/dbSchema");
const logger = require("../utils/logger");

const SRV_DEF = getDefinition("STOCK_SERVICES", PRODUCT_SCHEMA);
const srvTable = tableName(SRV_DEF.tableName, SCHEMA_PRODUCT);
const prodTable = tableName("product", SCHEMA_PRODUCT);

async function run() {
  try {
    logger.info("Bắt đầu migration thêm product_id vào stock_services...");

    // 1. Thêm cột product_id, đổi product_type -> product_type_old
    const hasProductId = await db.schema.withSchema(SCHEMA_PRODUCT).hasColumn(SRV_DEF.tableName, "product_id");
    if (!hasProductId) {
      await db.schema.withSchema(SCHEMA_PRODUCT).alterTable(SRV_DEF.tableName, (t) => {
        t.integer("product_id").unsigned().nullable().references("id").inTable(`${SCHEMA_PRODUCT}.product`).onDelete("SET NULL");
        t.renameColumn("product_type", "product_type_old");
      });
      logger.info("Đã thêm cột product_id và đổi tên product_type -> product_type_old.");
    } else {
      logger.info("Cột product_id đã tồn tại, bỏ qua tạo cột.");
    }

    // 2. Chuyển đổi dữ liệu
    const services = await db(srvTable).select("id", "product_type_old").whereNull("product_id").whereNotNull("product_type_old");
    logger.info(`Tìm thấy ${services.length} services cần migration.`);

    for (const srv of services) {
      if (!srv.product_type_old || srv.product_type_old.trim() === "") continue;
      
      const typeStr = srv.product_type_old.trim();

      // Tìm product có package_name tương ứng
      const prod = await db(prodTable).whereRaw("TRIM(LOWER(package_name)) = ?", [typeStr.toLowerCase()]).first();

      let prodId;
      if (prod) {
        prodId = prod.id;
      } else {
        // Chưa có, tự động tạo mới
        const [inserted] = await db(prodTable).insert({
          package_name: typeStr,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).returning("id");
        prodId = inserted.id !== undefined ? inserted.id : inserted;
        logger.info(`Đã tạo Product mới: [${typeStr}] -> ID: ${prodId}`);
      }

      await db(srvTable).where("id", srv.id).update({ product_id: prodId });
    }

    logger.info("Migration hoàn tất thành công!");
    process.exit(0);
  } catch (error) {
    logger.error("Migration lỗi:", error);
    process.exit(1);
  }
}

run();
