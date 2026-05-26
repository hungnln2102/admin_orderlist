/**
 * Cột `otp_source` cho `system_automation.order_user_tracking`.
 * Code upsert tracking đã ghi otp_source khi thêm tay từ modal — DB cũ thiếu cột → 500.
 *
 * @see database/migrations/000_consolidated_schema.sql (otp_source + check constraint)
 */

const TABLE = "system_automation.order_user_tracking";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'system_automation'
          AND table_name = 'order_user_tracking'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'system_automation'
          AND table_name = 'order_user_tracking'
          AND column_name = 'otp_source'
      ) THEN
        ALTER TABLE ${TABLE}
          ADD COLUMN otp_source text NOT NULL DEFAULT 'imap';
      END IF;
    END $$;
  `);

  await knex.schema.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'order_user_tracking_otp_source_check'
      ) THEN
        ALTER TABLE ${TABLE}
          ADD CONSTRAINT order_user_tracking_otp_source_check
          CHECK (otp_source = ANY (ARRAY['none', 'imap', 'tinyhost', 'hdsd', 'ades']::text[]));
      END IF;
    END $$;
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP CONSTRAINT IF EXISTS order_user_tracking_otp_source_check;
  `);
  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP COLUMN IF EXISTS otp_source;
  `);
};
