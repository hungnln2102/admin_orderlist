const TABLE = "system_automation.accounts_admin";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'alert_config'
      ) THEN
        ALTER TABLE ${TABLE}
          RENAME COLUMN "alert_config" TO "cookie_config";
      END IF;
    END $$;
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'cookie_config'
      ) THEN
        ALTER TABLE ${TABLE}
          RENAME COLUMN "cookie_config" TO "alert_config";
      END IF;
    END $$;
  `);
};
