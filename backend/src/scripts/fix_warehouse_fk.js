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
    } else {
      logger.info("Không tìm thấy FK cũ trỏ vào product. (Có thể đã bị xoá trước đó).");
    }

    logger.info(`Chuẩn hoá lại dữ liệu product_id để khớp với bảng variant...`);
    await db.raw(`
      UPDATE ${SCHEMA_PRODUCT}.${SRV_DEF.tableName} ss
      SET product_id = (
        SELECT v.id FROM ${SCHEMA_PRODUCT}.variant v 
        WHERE v.product_id = ss.product_id 
        LIMIT 1
      )
      WHERE NOT EXISTS (
        SELECT 1 FROM ${SCHEMA_PRODUCT}.variant v2 WHERE v2.id = ss.product_id
      ) AND ss.product_id IS NOT NULL
    `);

    await db.raw(`
      UPDATE ${SCHEMA_PRODUCT}.${SRV_DEF.tableName} ss
      SET product_id = NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM ${SCHEMA_PRODUCT}.variant v WHERE v.id = ss.product_id
      ) AND ss.product_id IS NOT NULL
    `);

    // Check if new FK already exists
    const queryNew = `
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = '${SCHEMA_PRODUCT}.${SRV_DEF.tableName}'::regclass
      AND confrelid = '${SCHEMA_PRODUCT}.variant'::regclass;
    `;
    const resultNew = await db.raw(queryNew);
    
    if (resultNew.rows && resultNew.rows.length === 0) {
      logger.info(`Đang thêm foreign key mới trỏ vào variant...`);
      await db.schema.withSchema(SCHEMA_PRODUCT).alterTable(SRV_DEF.tableName, (t) => {
        t.foreign("product_id").references("id").inTable(`${SCHEMA_PRODUCT}.variant`).onDelete("SET NULL");
      });
      logger.info("Thêm FK mới thành công!");
    } else {
      logger.info("FK trỏ vào variant đã tồn tại.");
    }
    
    process.exit(0);
  } catch (error) {
    logger.error("Lỗi khi sửa FK:", error);
    process.exit(1);
  }
}

run();
