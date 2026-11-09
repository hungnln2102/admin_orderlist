/**
 * Chuyển product API mapping từ external API config ID sang provider key hard-code.
 * Giữ api_config_id tạm thời để source/runtime có thể cut over an toàn trước khi drop bảng cũ.
 */
exports.up = async function (knex) {
  const BUSINESS_SCHEMA = process.env.DB_SCHEMA_PRODUCT || process.env.DB_SCHEMA_BUSINESS || "business";
  const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
  const hasProductMappings = await knex.schema.withSchema(BUSINESS_SCHEMA).hasTable("product_api_configs");
  const hasExternalConfigs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("external_api_configs");
  if (!hasProductMappings) return;

  const hasProviderKey = await knex.schema.withSchema(BUSINESS_SCHEMA).hasColumn("product_api_configs", "provider_key");
  if (!hasProviderKey) {
    await knex.schema.withSchema(BUSINESS_SCHEMA).alterTable("product_api_configs", (table) => {
      table.string("provider_key", 100).nullable();
    });
  }

  if (hasExternalConfigs) {
    await knex.raw(`
      UPDATE "${BUSINESS_SCHEMA}"."product_api_configs" AS pac
      SET provider_key = CASE WHEN eac.service_key = 'fix_ades' THEN 'ades' ELSE eac.service_key END
      FROM "${SYSTEM_SCHEMA}"."external_api_configs" AS eac
      WHERE pac.api_config_id = eac.id
        AND (pac.provider_key IS NULL OR pac.provider_key = '')
    `);
  }

  const unresolved = await knex.withSchema(BUSINESS_SCHEMA).table("product_api_configs").whereNull("provider_key").count({ count: "id" }).first();
  if (Number(unresolved?.count || 0) > 0) {
    throw new Error("Cannot cut over product_api_configs: one or more mappings have no provider_key.");
  }

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_api_configs_product_provider"
    ON "${BUSINESS_SCHEMA}"."product_api_configs" (product_id, provider_key)
  `);
};

exports.down = async function (knex) {
  const BUSINESS_SCHEMA = process.env.DB_SCHEMA_PRODUCT || process.env.DB_SCHEMA_BUSINESS || "business";
  const hasProductMappings = await knex.schema.withSchema(BUSINESS_SCHEMA).hasTable("product_api_configs");
  if (!hasProductMappings) return;
  await knex.raw(`DROP INDEX IF EXISTS "${BUSINESS_SCHEMA}"."uq_product_api_configs_product_provider"`);
  const hasProviderKey = await knex.schema.withSchema(BUSINESS_SCHEMA).hasColumn("product_api_configs", "provider_key");
  if (hasProviderKey) {
    await knex.schema.withSchema(BUSINESS_SCHEMA).alterTable("product_api_configs", (table) => {
      table.dropColumn("provider_key");
    });
  }
};