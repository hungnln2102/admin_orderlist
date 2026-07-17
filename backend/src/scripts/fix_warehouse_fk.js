require("module-alias/register");
const { db } = require("../db");
const { getDefinition, PRODUCT_SCHEMA, SCHEMA_PRODUCT, tableName } = require("../config/dbSchema");
const logger = require("../utils/logger");

const SRV_DEF = getDefinition("STOCK_SERVICES", PRODUCT_SCHEMA);

async function run() {
  try {
    logger.info("Bắt đầu sửa foreign key cho stock_services.product_id -> variant.id...");

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
    }

    logger.info(`Khôi phục các dịch vụ bị mất (bằng product_type_old)...`);
    const nullServices = await db(`${SCHEMA_PRODUCT}.${SRV_DEF.tableName}`)
      .whereNull("product_id")
      .whereNotNull("product_type_old");
      
    for (const srv of nullServices) {
      const typeStr = srv.product_type_old.trim();
      if (!typeStr) continue;

      let variant = await db(`${SCHEMA_PRODUCT}.variant`).whereRaw("TRIM(LOWER(display_name)) = ?", [typeStr.toLowerCase()]).first();
      
      if (!variant) {
         let prod = await db(`${SCHEMA_PRODUCT}.product`).whereRaw("TRIM(LOWER(package_name)) = ?", [typeStr.toLowerCase()]).first();
         let prodId;
         if (!prod) {
           const [insertedProd] = await db(`${SCHEMA_PRODUCT}.product`).insert({ 
             package_name: typeStr,
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString()
           }).returning("id");
           prodId = insertedProd.id !== undefined ? insertedProd.id : insertedProd;
         } else {
           prodId = prod.id;
         }
         
         const [insertedVar] = await db(`${SCHEMA_PRODUCT}.variant`).insert({
            product_id: prodId,
            display_name: typeStr,
            variant_name: typeStr,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
         }).returning("id");
         variant = { id: insertedVar.id !== undefined ? insertedVar.id : insertedVar };
      }

      await db(`${SCHEMA_PRODUCT}.${SRV_DEF.tableName}`).where("id", srv.id).update({ product_id: variant.id });
    }

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
