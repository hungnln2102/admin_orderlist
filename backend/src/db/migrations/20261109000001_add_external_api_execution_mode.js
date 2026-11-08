const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

const EXECUTION_MODES = {
  tinyhost: "MAILBOX_REST",
  fix_ades: "AUTHENTICATED_OTP",
  yuna_2fa: "YUNA_2FA",
  yuna_mail: "YUNA_MAIL",
  vivarocky_household: "VIVAROCKY_HTML",
  vivarocky_six_digit: "VIVAROCKY_HTML",
  vivarocky_signin: "VIVAROCKY_HTML",
  totp: "INTERNAL_TOTP",
  warehouse_2fa: "INTERNAL_WAREHOUSE_2FA",
};

exports.up = async (knex) => {
  const hasTable = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("external_api_configs");
  if (!hasTable) return;

  await knex.raw(`
    ALTER TABLE ${SYSTEM_SCHEMA}.external_api_configs
      ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(64) NOT NULL DEFAULT 'GENERIC_HTTP';
  `);

  for (const [serviceKey, executionMode] of Object.entries(EXECUTION_MODES)) {
    await knex
      .withSchema(SYSTEM_SCHEMA)
      .table("external_api_configs")
      .where("service_key", serviceKey)
      .update({ execution_mode: executionMode, updated_at: knex.fn.now() });
  }
};

exports.down = async (knex) => {
  const hasTable = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("external_api_configs");
  if (!hasTable) return;

  await knex.raw(`
    ALTER TABLE ${SYSTEM_SCHEMA}.external_api_configs
      DROP COLUMN IF EXISTS execution_mode;
  `);
};