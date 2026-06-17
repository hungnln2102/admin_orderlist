const { SCHEMA_RENEW_ADOBE } = require("../src/config/dbSchema");

const schema = SCHEMA_RENEW_ADOBE || "system_automation";

exports.up = async function up(knex) {
  await knex.schema.raw(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS "${schema}".system_event_logs (
      id BIGSERIAL PRIMARY KEY,
      log_type TEXT NOT NULL CHECK (log_type IN ('system', 'user')),
      level TEXT NOT NULL DEFAULT 'info',
      action TEXT,
      entity TEXT,
      entity_id TEXT,
      message TEXT NOT NULL,
      actor_id TEXT,
      actor_name TEXT,
      source TEXT,
      request_method TEXT,
      request_path TEXT,
      ip_address TEXT,
      user_agent TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS system_event_logs_type_created_idx
      ON "${schema}".system_event_logs (log_type, created_at DESC);

    CREATE INDEX IF NOT EXISTS system_event_logs_level_created_idx
      ON "${schema}".system_event_logs (level, created_at DESC);

    CREATE INDEX IF NOT EXISTS system_event_logs_entity_idx
      ON "${schema}".system_event_logs (entity, entity_id);

    CREATE INDEX IF NOT EXISTS system_event_logs_metadata_gin_idx
      ON "${schema}".system_event_logs USING GIN (metadata);
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`DROP TABLE IF EXISTS "${schema}".system_event_logs`);
};
