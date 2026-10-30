/**
 * Migration: Bổ sung product_id vào warehouse.product_names để liên kết Dịch vụ kho với Sản phẩm hệ thống (business.product)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const schemaWarehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
  const schemaProduct = process.env.DB_SCHEMA_PRODUCT || process.env.SCHEMA_PRODUCT || "business";

  await knex.raw(`
    ALTER TABLE ${schemaWarehouse}.product_names 
      ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES ${schemaProduct}.product(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_warehouse_product_names_product_id 
      ON ${schemaWarehouse}.product_names (product_id);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const schemaWarehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  await knex.raw(`
    DROP INDEX IF EXISTS ${schemaWarehouse}.idx_warehouse_product_names_product_id;

    ALTER TABLE ${schemaWarehouse}.product_names 
      DROP COLUMN IF EXISTS product_id;
  `);
};

