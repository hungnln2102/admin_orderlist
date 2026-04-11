const TABLE = "system_automation.accounts_admin";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'otp_source'
      ) THEN
        ALTER TABLE ${TABLE}
          ADD COLUMN "otp_source" TEXT DEFAULT 'imap';
      END IF;
    END $$;
  `);

  await knex.schema.raw(`
    UPDATE ${TABLE}
    SET otp_source = 'imap'
    WHERE otp_source IS NULL OR trim(otp_source) = '';
  `);

  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP CONSTRAINT IF EXISTS accounts_admin_otp_source_check;

    ALTER TABLE ${TABLE}
      ADD CONSTRAINT accounts_admin_otp_source_check
      CHECK (otp_source IN ('imap', 'tinyhost', 'hdsd'));
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP CONSTRAINT IF EXISTS accounts_admin_otp_source_check;
  `);

  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP COLUMN IF EXISTS otp_source;
  `);
};
