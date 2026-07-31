const ACCOUNTS_TABLE = "system_automation.accounts_admin";
const TRACKING_TABLE = "system_automation.order_user_tracking";

exports.up = async function up(knex) {
  // 1. Add yuna_order_code columns
  await knex.schema.alterTable(ACCOUNTS_TABLE, (table) => {
    table.text("yuna_order_code").nullable();
  });
  await knex.schema.alterTable(TRACKING_TABLE, (table) => {
    table.text("yuna_order_code").nullable();
  });

  // 2. Alter accounts_admin constraints
  await knex.schema.raw(`
    ALTER TABLE ${ACCOUNTS_TABLE}
      DROP CONSTRAINT IF EXISTS accounts_admin_otp_source_check;

    ALTER TABLE ${ACCOUNTS_TABLE}
      ADD CONSTRAINT accounts_admin_otp_source_check
      CHECK (otp_source IN ('imap', 'tinyhost', 'hdsd', 'ades', 'yuna'));
  `);

  // 3. Alter order_user_tracking constraints
  await knex.schema.raw(`
    ALTER TABLE ${TRACKING_TABLE}
      DROP CONSTRAINT IF EXISTS order_user_tracking_otp_source_check;

    ALTER TABLE ${TRACKING_TABLE}
      ADD CONSTRAINT order_user_tracking_otp_source_check
      CHECK (otp_source IN ('none', 'imap', 'tinyhost', 'hdsd', 'ades', 'yuna'));
  `);
};

exports.down = async function down(knex) {
  // 1. Rollback constraint for accounts_admin
  await knex.schema.raw(`
    UPDATE ${ACCOUNTS_TABLE}
    SET otp_source = 'imap'
    WHERE otp_source = 'yuna';

    ALTER TABLE ${ACCOUNTS_TABLE}
      DROP CONSTRAINT IF EXISTS accounts_admin_otp_source_check;

    ALTER TABLE ${ACCOUNTS_TABLE}
      ADD CONSTRAINT accounts_admin_otp_source_check
      CHECK (otp_source IN ('imap', 'tinyhost', 'hdsd', 'ades'));
  `);

  // 2. Rollback constraint for order_user_tracking
  await knex.schema.raw(`
    UPDATE ${TRACKING_TABLE}
    SET otp_source = 'none'
    WHERE otp_source = 'yuna';

    ALTER TABLE ${TRACKING_TABLE}
      DROP CONSTRAINT IF EXISTS order_user_tracking_otp_source_check;

    ALTER TABLE ${TRACKING_TABLE}
      ADD CONSTRAINT order_user_tracking_otp_source_check
      CHECK (otp_source IN ('none', 'imap', 'tinyhost', 'hdsd', 'ades'));
  `);

  // 3. Remove yuna_order_code columns
  await knex.schema.alterTable(ACCOUNTS_TABLE, (table) => {
    table.dropColumn("yuna_order_code");
  });
  await knex.schema.alterTable(TRACKING_TABLE, (table) => {
    table.dropColumn("yuna_order_code");
  });
};
