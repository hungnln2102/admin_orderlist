require("module-alias/register");
const { db } = require("../db");
const { getDefinition, PRODUCT_SCHEMA, SCHEMA_PRODUCT, WAREHOUSE_SCHEMA, SCHEMA_WAREHOUSE, tableName } = require("../config/dbSchema");
const logger = require("../utils/logger");

const SRV_DEF = getDefinition("STOCK_SERVICES", WAREHOUSE_SCHEMA);

async function getOrCreateVariant(typeStr, existingProductId = null) {
  let variant = await db(`${SCHEMA_PRODUCT}.variant`).whereRaw("TRIM(LOWER(display_name)) = ?", [typeStr.toLowerCase()]).first();
  if (variant) return variant.id;

  let prodId = existingProductId;
  if (!prodId) {
    let prod = await db(`${SCHEMA_PRODUCT}.product`).whereRaw("TRIM(LOWER(package_name)) = ?", [typeStr.toLowerCase()]).first();
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
  }

  const [insertedVar] = await db(`${SCHEMA_PRODUCT}.variant`).insert({
    product_id: prodId,
    display_name: typeStr,
    variant_name: typeStr,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).returning("id");
  return insertedVar.id !== undefined ? insertedVar.id : insertedVar;
}

async function run() {
  try {
    logger.info("Bắt đầu sửa foreign key cho stock_services.product_id -> variant.id...");

    // 1. Drop old constraint
    const query = `
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = '${SCHEMA_WAREHOUSE}.${SRV_DEF.tableName}'::regclass
      AND confrelid = '${SCHEMA_PRODUCT}.product'::regclass;
    `;
    const result = await db.raw(query);
    
    if (result.rows && result.rows.length > 0) {
      for (const row of result.rows) {
        const fkName = row.conname;
        logger.info(`Đang xoá foreign key cũ: ${fkName}`);
        await db.raw(`ALTER TABLE ${SCHEMA_WAREHOUSE}.${SRV_DEF.tableName} DROP CONSTRAINT "${fkName}"`);
      }
    }

    // 2. Fetch all stock_services
    logger.info(`Đang đồng bộ lại ID...`);
    const allServices = await db(`${SCHEMA_WAREHOUSE}.${SRV_DEF.tableName}`).select("id", "product_id", "product_type_old");
    
    for (const srv of allServices) {
      let targetVariantId = null;
      const oldTypeStr = srv.product_type_old ? srv.product_type_old.trim() : "";

      if (srv.product_id !== null) {
        // First check if it's ALREADY a valid variant.id (e.g. newly created orders)
        const isAlreadyVariant = await db(`${SCHEMA_PRODUCT}.variant`).where("id", srv.product_id).first();
        if (isAlreadyVariant) {
          targetVariantId = srv.product_id;
        } else {
          // Assume product_id is currently a product.id. Try to find a matching variant for this product
          const existingVariant = await db(`${SCHEMA_PRODUCT}.variant`).where("product_id", srv.product_id).first();
          if (existingVariant) {
            targetVariantId = existingVariant.id;
          } else if (oldTypeStr) {
            // No variant exists for this product. Create one using oldTypeStr
            targetVariantId = await getOrCreateVariant(oldTypeStr, srv.product_id);
          } else {
            targetVariantId = null;
          }
        }
      } else if (oldTypeStr) {
        // product_id is NULL, fallback to product_type_old
        targetVariantId = await getOrCreateVariant(oldTypeStr, null);
      }

      if (targetVariantId && targetVariantId !== srv.product_id) {
        await db(`${SCHEMA_WAREHOUSE}.${SRV_DEF.tableName}`).where("id", srv.id).update({ product_id: targetVariantId });
      } else if (!targetVariantId && srv.product_id !== null) {
        // If we really can't find a variant, set to NULL to prevent FK violation
        await db(`${SCHEMA_WAREHOUSE}.${SRV_DEF.tableName}`).where("id", srv.id).update({ product_id: null });
      }
    }

    // 3. Add new constraint
    const queryNew = `
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = '${SCHEMA_WAREHOUSE}.${SRV_DEF.tableName}'::regclass
      AND confrelid = '${SCHEMA_PRODUCT}.variant'::regclass;
    `;
    const resultNew = await db.raw(queryNew);
    
    if (resultNew.rows && resultNew.rows.length === 0) {
      logger.info(`Đang thêm foreign key mới trỏ vào variant...`);
      await db.schema.withSchema(SCHEMA_WAREHOUSE).alterTable(SRV_DEF.tableName, (t) => {
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
