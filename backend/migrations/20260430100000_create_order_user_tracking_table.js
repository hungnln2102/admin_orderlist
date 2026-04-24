const TABLE = "system_automation.order_user_tracking";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    CREATE SCHEMA IF NOT EXISTS system_automation;

    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT NOT NULL,
      customer TEXT,
      account TEXT,
      org_name TEXT,
      expired DATE,
      status TEXT NOT NULL DEFAULT 'chưa add',
      update_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT order_user_tracking_status_check
        CHECK (status IN ('có gói', 'chưa cấp quyền', 'chưa add')),
      CONSTRAINT order_user_tracking_order_id_unique UNIQUE (order_id)
    );

    CREATE INDEX IF NOT EXISTS idx_order_user_tracking_account
      ON ${TABLE} (account);

    CREATE INDEX IF NOT EXISTS idx_order_user_tracking_status
      ON ${TABLE} (status);

    CREATE INDEX IF NOT EXISTS idx_order_user_tracking_expired
      ON ${TABLE} (expired);
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    DROP TABLE IF EXISTS ${TABLE};
  `);
};
