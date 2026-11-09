/**
 * Hoàn tất cut-over provider hard-code.
 * Migration trước đã backfill provider_key; migration này mới loại bỏ khóa ngoại và bảng cấu hình API cũ.
 */
exports.up = async function (knex) {
  const businessSchema = process.env.DB_SCHEMA_PRODUCT || process.env.DB_SCHEMA_BUSINESS || "business";
  const systemSchema = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
  const hasMappings = await knex.schema.withSchema(businessSchema).hasTable("product_api_configs");
  if (hasMappings) {
    const hasProviderKey = await knex.schema.withSchema(businessSchema).hasColumn("product_api_configs", "provider_key");
    if (!hasProviderKey) throw new Error("provider_key must exist before dropping api_config_id.");
    const missing = await knex.withSchema(businessSchema).table("product_api_configs").whereNull("provider_key").count({ count: "id" }).first();
    if (Number(missing?.count || 0) > 0) throw new Error("Cannot drop api_config_id while product mappings have no provider_key.");
    const hasApiConfigId = await knex.schema.withSchema(businessSchema).hasColumn("product_api_configs", "api_config_id");
    if (hasApiConfigId) {
      await knex.schema.withSchema(businessSchema).alterTable("product_api_configs", (table) => table.dropColumn("api_config_id"));
    }
    await knex.raw('ALTER TABLE "' + businessSchema + '"."product_api_configs" ALTER COLUMN "provider_key" SET NOT NULL');
  }
  const hasExternalConfigs = await knex.schema.withSchema(systemSchema).hasTable("external_api_configs");
  if (hasExternalConfigs) await knex.schema.withSchema(systemSchema).dropTable("external_api_configs");
};

exports.down = async function (knex) {
  const businessSchema = process.env.DB_SCHEMA_PRODUCT || process.env.DB_SCHEMA_BUSINESS || "business";
  const hasMappings = await knex.schema.withSchema(businessSchema).hasTable("product_api_configs");
  if (hasMappings && !(await knex.schema.withSchema(businessSchema).hasColumn("product_api_configs", "api_config_id"))) {
    await knex.schema.withSchema(businessSchema).alterTable("product_api_configs", (table) => table.bigInteger("api_config_id").nullable());
  }
};
