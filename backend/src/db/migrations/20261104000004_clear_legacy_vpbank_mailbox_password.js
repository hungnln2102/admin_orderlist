const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM_AUTOMATION || "system_automation";
const CONFIG_KEY = "VPBANK_MAILBOX_CONFIG";

exports.up = async function up(knex) {
  await knex.raw(`
    UPDATE ${SYSTEM_SCHEMA}.system_configs
    SET config_value = (config_value::jsonb - 'appPassword')::text,
        updated_at = NOW()
    WHERE config_key = '${CONFIG_KEY}'
      AND config_value LIKE '%"appPassword"%';
  `);
};

exports.down = async function down() {
  // Removed plaintext passwords cannot be restored safely.
};
