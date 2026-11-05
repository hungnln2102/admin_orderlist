const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

exports.up = async (knex) => {
  const table = `${SYSTEM_SCHEMA}.domain_event_store`;

  await knex.raw(`
    ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS action VARCHAR(50),
      ADD COLUMN IF NOT EXISTS before_state JSONB,
      ADD COLUMN IF NOT EXISTS after_state JSONB,
      ADD COLUMN IF NOT EXISTS changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS actor_type VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
      ADD COLUMN IF NOT EXISTS actor_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
      ADD COLUMN IF NOT EXISTS request_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reason TEXT,
      ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
  `);

  await knex.raw(`
    ALTER TABLE ${table}
      ALTER COLUMN status SET DEFAULT 'PENDING',
      ALTER COLUMN processed_at DROP NOT NULL;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_domain_event_store_outbox
    ON ${table} (status, created_at ASC);
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_domain_event_store_correlation
    ON ${table} (correlation_id, created_at DESC)
    WHERE correlation_id IS NOT NULL;
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_domain_event_store_idempotency
    ON ${table} (event_name, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
  `);
};

exports.down = async () => {
  // Audit history is intentionally retained on rollback.
};
