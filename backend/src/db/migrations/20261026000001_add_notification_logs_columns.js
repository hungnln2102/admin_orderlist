/**
 * Migration bổ sung cột cho system_automation.notification_logs
 */
exports.up = async function (knex) {
  const schemaSystem = process.env.DB_SCHEMA_SYSTEM || "system_automation";
  await knex.raw(`
    ALTER TABLE ${schemaSystem}.notification_logs
      ADD COLUMN IF NOT EXISTS event_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS recipient VARCHAR(255),
      ADD COLUMN IF NOT EXISTS message_content TEXT;

    ALTER TABLE ${schemaSystem}.notification_logs
      ALTER COLUMN topic_type DROP NOT NULL;
  `);
};

exports.down = async function (knex) {
  const schemaSystem = process.env.DB_SCHEMA_SYSTEM || "system_automation";
  await knex.raw(`
    ALTER TABLE ${schemaSystem}.notification_logs
      DROP COLUMN IF EXISTS event_type,
      DROP COLUMN IF EXISTS recipient,
      DROP COLUMN IF EXISTS message_content;
  `);
};
