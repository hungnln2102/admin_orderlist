const TABLE = "system_automation.accounts_admin";

exports.up = async function (knex) {
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'password_enc'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'password_encrypted'
      ) THEN
        ALTER TABLE ${TABLE} RENAME COLUMN "password_enc" TO "password_encrypted";
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'last_checked'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'last_checked_at'
      ) THEN
        ALTER TABLE ${TABLE} RENAME COLUMN "last_checked" TO "last_checked_at";
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'url_access'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'access_url'
      ) THEN
        ALTER TABLE ${TABLE} RENAME COLUMN "url_access" TO "access_url";
      END IF;
    END $$;
  `);
};

exports.down = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE} RENAME COLUMN "password_encrypted" TO "password_enc";
    ALTER TABLE ${TABLE} RENAME COLUMN "last_checked_at" TO "last_checked";
    ALTER TABLE ${TABLE} RENAME COLUMN "access_url" TO "url_access";
  `);
};
