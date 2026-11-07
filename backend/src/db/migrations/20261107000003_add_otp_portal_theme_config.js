const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM_AUTOMATION || "system_automation";
const CONFIG_KEY = "OTP_PORTAL_THEME";

exports.up = async function up(knex) {
  const existing = await knex.raw(`
    SELECT 1 FROM ${SYSTEM_SCHEMA}.system_configs WHERE config_key = '${CONFIG_KEY}'
  `);
  if (!existing.rows || existing.rows.length === 0) {
    await knex.raw(`
      INSERT INTO ${SYSTEM_SCHEMA}.system_configs (config_key, config_value, data_type, group_name, description, updated_by)
      VALUES (
        '${CONFIG_KEY}',
        '{"mode":"auto","theme":null}',
        'JSON',
        'PORTAL',
        'Cấu hình giao diện lễ hội cho OTP Portal (mode: auto | fixed)',
        'SYSTEM'
      )
    `);
  }
};

exports.down = async function down(knex) {
  await knex.raw(`DELETE FROM ${SYSTEM_SCHEMA}.system_configs WHERE config_key = '${CONFIG_KEY}'`);
};

