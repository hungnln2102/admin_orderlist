/**
 * Cột `otp_source` cho `system_automation.order_user_tracking` — ghi nguồn OTP
 * của từng đơn/user (imap, tinyhost, hdsd, ades).
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
          ADD COLUMN "otp_source" TEXT NOT NULL DEFAULT 'imap';
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
      DROP CONSTRAINT IF EXISTS order_user_tracking_otp_source_check;

    ALTER TABLE ${TABLE}
      ADD CONSTRAINT order_user_tracking_otp_source_check
      CHECK (otp_source IN ('imap', 'tinyhost', 'hdsd', 'ades'));
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
