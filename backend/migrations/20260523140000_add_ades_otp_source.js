const TABLE = "system_automation.accounts_admin";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP CONSTRAINT IF EXISTS accounts_admin_otp_source_check;

    ALTER TABLE ${TABLE}
      ADD CONSTRAINT accounts_admin_otp_source_check
      CHECK (otp_source IN ('imap', 'tinyhost', 'hdsd', 'ades'));
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    UPDATE ${TABLE}
    SET otp_source = 'imap'
    WHERE otp_source = 'ades';
  `);

  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP CONSTRAINT IF EXISTS accounts_admin_otp_source_check;

    ALTER TABLE ${TABLE}
      ADD CONSTRAINT accounts_admin_otp_source_check
      CHECK (otp_source IN ('imap', 'tinyhost', 'hdsd'));
  `);
};
