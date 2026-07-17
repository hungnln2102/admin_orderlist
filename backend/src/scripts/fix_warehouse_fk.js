require("module-alias/register");
const { db } = require("../db");
const { getDefinition, PRODUCT_SCHEMA, SCHEMA_PRODUCT, tableName } = require("../config/dbSchema");
const logger = require("../utils/logger");

const SRV_DEF = getDefinition("STOCK_SERVICES", PRODUCT_SCHEMA);

async function run() {
  try {
    logger.info("Bắt đầu sửa foreign key cho stock_services.product_id -> variant.id...");

    // Find the foreign key constraint name
    const query = `
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = '${SCHEMA_PRODUCT}.${SRV_DEF.tableName}'::regclass
      AND confrelid = '${SCHEMA_PRODUCT}.product'::regclass;
    `;
    const result = await db.raw(query);
    
    if (result.rows && result.rows.length > 0) {
      for (const row of result.rows) {
        const fkName = row.conname;
        logger.info(`Đang xoá foreign key cũ: ${fkName}`);
        await db.raw(`ALTER TABLE ${SCHEMA_PRODUCT}.${SRV_DEF.tableName} DROP CONSTRAINT "${fkName}"`);
      }
      
      logger.info(`Đang thêm foreign key mới trỏ vào variant...`);
      await db.schema.withSchema(SCHEMA_PRODUCT).alterTable(SRV_DEF.tableName, (t) => {
        t.foreign("product_id").references("id").inTable(`${SCHEMA_PRODUCT}.variant`).onDelete("SET NULL");
      });
      logger.info("Sửa FK thành công!");
    } else {
      logger.info("Không tìm thấy FK cũ trỏ vào product. Có thể đã sửa rồi.");
    }
    
    process.exit(0);
  } catch (error) {
    logger.error("Lỗi khi sửa FK:", error);
    process.exit(1);
  }
}

run();
