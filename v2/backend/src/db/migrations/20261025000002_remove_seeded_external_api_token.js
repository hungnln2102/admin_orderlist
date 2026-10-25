const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

exports.up = async (knex) => {
  await knex.withSchema(SYSTEM_SCHEMA)
    .table("external_api_configs")
    .where("service_key", "yuna_2fa")
    .update({
      auth_config: knex.raw("COALESCE(auth_config, '{}'::jsonb) - 'defaultToken'"),
      updated_at: knex.fn.now(),
    });
};

exports.down = async () => {};
