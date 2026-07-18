/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Create warehouse schema
  await knex.schema.createSchemaIfNotExists("warehouse");

  // 2. Move tables to warehouse schema
  // Note: package_product has foreign keys to these tables, but postgres handles cross-schema FKs natively.
  await knex.raw('ALTER TABLE "product"."product_stocks" SET SCHEMA "warehouse"');
  await knex.raw('ALTER TABLE "product"."stock_services" SET SCHEMA "warehouse"');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // 1. Move tables back to product schema
  await knex.raw('ALTER TABLE "warehouse"."stock_services" SET SCHEMA "product"');
  await knex.raw('ALTER TABLE "warehouse"."product_stocks" SET SCHEMA "product"');

  // 2. Drop warehouse schema
  await knex.schema.dropSchemaIfExists("warehouse");
};
