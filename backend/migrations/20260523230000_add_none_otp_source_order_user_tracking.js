/**
 * Thêm `none` — mail chính chủ, khách tự lấy OTP, không gắn nguồn hệ thống.
 */

const TABLE = "system_automation.order_user_tracking";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP CONSTRAINT IF EXISTS order_user_tracking_otp_source_check;

    ALTER TABLE ${TABLE}
      ADD CONSTRAINT order_user_tracking_otp_source_check
      CHECK (otp_source IN ('none', 'imap', 'tinyhost', 'hdsd', 'ades'));
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    UPDATE ${TABLE}
    SET otp_source = 'imap'
    WHERE otp_source = 'none';
  `);

  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP CONSTRAINT IF EXISTS order_user_tracking_otp_source_check;

    ALTER TABLE ${TABLE}
      ADD CONSTRAINT order_user_tracking_otp_source_check
      CHECK (otp_source IN ('imap', 'tinyhost', 'hdsd', 'ades'));
  `);
};
