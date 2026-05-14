/**
 * Gộp số slot license vào cột user_count; bỏ cột lisencecount.
 */

const TABLE = "system_automation.accounts_admin";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    UPDATE ${TABLE}
    SET user_count = lisencecount
    WHERE lisencecount IS NOT NULL AND lisencecount > 0;
  `);
  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP COLUMN IF EXISTS lisencecount;
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'accounts_admin'
          AND column_name = 'lisencecount'
      ) THEN
        ALTER TABLE ${TABLE}
          ADD COLUMN "lisencecount" INTEGER NULL;
      END IF;
    END $$;
  `);
};
