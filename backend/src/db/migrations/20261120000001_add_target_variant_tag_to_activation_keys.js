/**
 * Snapshot the configured warehouse tag on activation-key rules and generated keys.
 * Existing records remain nullable so legacy keys keep their previous product-wide behavior.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  const warehouseSchema = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  await knex.schema.withSchema(warehouseSchema).alterTable("activation_key_rules", (table) => {
    table.string("target_variant_tag", 255).nullable();
  });
  await knex.schema.withSchema(warehouseSchema).alterTable("activation_keys", (table) => {
    table.string("target_variant_tag", 255).nullable();
  });

  // Cấu hình cũ phải chọn tag trước khi được kích hoạt lại.
  await knex(warehouseSchema + ".activation_key_rules")
    .whereNull("target_variant_tag")
    .update({ is_active: false });

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_activation_key_rules_product_tag
      ON ${warehouseSchema}.activation_key_rules (product_name_id, target_variant_tag);
    CREATE INDEX IF NOT EXISTS idx_activation_keys_product_tag_status
      ON ${warehouseSchema}.activation_keys (product_name_id, target_variant_tag, status);
  `);
};

exports.down = async function (knex) {
  const warehouseSchema = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";

  await knex.raw(`
    DROP INDEX IF EXISTS ${warehouseSchema}.idx_activation_keys_product_tag_status;
    DROP INDEX IF EXISTS ${warehouseSchema}.idx_activation_key_rules_product_tag;
  `);
  await knex.schema.withSchema(warehouseSchema).alterTable("activation_keys", (table) => {
    table.dropColumn("target_variant_tag");
  });
  await knex.schema.withSchema(warehouseSchema).alterTable("activation_key_rules", (table) => {
    table.dropColumn("target_variant_tag");
  });
};
