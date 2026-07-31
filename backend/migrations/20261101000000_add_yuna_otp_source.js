const ACCOUNTS_TABLE = "system_automation.accounts_admin";
const TRACKING_TABLE = "system_automation.order_user_tracking";
const OTP_CONFIGS_TABLE = "system_automation.otp_configs";

exports.up = async function up(knex) {
  // 1. Create otp_configs table
  await knex.schema.createTable(OTP_CONFIGS_TABLE, (table) => {
    table.increments("id").primary();
    table.string("otp_source", 50).notNullable();
    table.integer("mail_backup_id").nullable();
    table.string("yuna_order_code", 255).nullable();
    table.timestamps(true, true);
  });

  // 2. Add foreign key columns
  await knex.schema.alterTable(ACCOUNTS_TABLE, (table) => {
    table.integer("otp_config_id").unsigned().nullable().references("id").inTable(OTP_CONFIGS_TABLE).onDelete("SET NULL");
  });
  await knex.schema.alterTable(TRACKING_TABLE, (table) => {
    table.integer("otp_config_id").unsigned().nullable().references("id").inTable(OTP_CONFIGS_TABLE).onDelete("SET NULL");
  });

  // 3. Data Migration: Move existing values
  const accounts = await knex(ACCOUNTS_TABLE).select("id", "otp_source", "mail_backup_id");
  for (const account of accounts) {
    if (account.otp_source) {
      const [inserted] = await knex(OTP_CONFIGS_TABLE)
        .insert({
          otp_source: account.otp_source,
          mail_backup_id: account.mail_backup_id
        })
        .returning("id");
      const configId = typeof inserted === "object" ? inserted.id : inserted;
      await knex(ACCOUNTS_TABLE).where("id", account.id).update({ otp_config_id: configId });
    }
  }

  const tracks = await knex(TRACKING_TABLE).select("id", "otp_source");
  for (const track of tracks) {
    if (track.otp_source && track.otp_source !== "none") {
      const [inserted] = await knex(OTP_CONFIGS_TABLE)
        .insert({
          otp_source: track.otp_source
        })
        .returning("id");
      const configId = typeof inserted === "object" ? inserted.id : inserted;
      await knex(TRACKING_TABLE).where("id", track.id).update({ otp_config_id: configId });
    }
  }

  // 4. Drop legacy constraints & columns
  await knex.schema.raw(`
    ALTER TABLE ${ACCOUNTS_TABLE} DROP CONSTRAINT IF EXISTS accounts_admin_otp_source_check;
    ALTER TABLE ${TRACKING_TABLE} DROP CONSTRAINT IF EXISTS order_user_tracking_otp_source_check;
  `);

  await knex.schema.alterTable(ACCOUNTS_TABLE, (table) => {
    table.dropColumn("otp_source");
    table.dropColumn("mail_backup_id");
  });

  await knex.schema.alterTable(TRACKING_TABLE, (table) => {
    table.dropColumn("otp_source");
  });
};

exports.down = async function down(knex) {
  // 1. Re-add legacy columns
  await knex.schema.alterTable(ACCOUNTS_TABLE, (table) => {
    table.string("otp_source", 50).nullable();
    table.integer("mail_backup_id").nullable();
  });
  await knex.schema.alterTable(TRACKING_TABLE, (table) => {
    table.string("otp_source", 50).nullable();
  });

  // 2. Add old check constraints
  await knex.schema.raw(`
    ALTER TABLE ${ACCOUNTS_TABLE}
      ADD CONSTRAINT accounts_admin_otp_source_check
      CHECK (otp_source IN ('imap', 'tinyhost', 'hdsd', 'ades'));
    
    ALTER TABLE ${TRACKING_TABLE}
      ADD CONSTRAINT order_user_tracking_otp_source_check
      CHECK (otp_source IN ('none', 'imap', 'tinyhost', 'hdsd', 'ades'));
  `);

  // 3. Data Migration: Populate legacy columns from otp_configs
  const accounts = await knex(ACCOUNTS_TABLE)
    .join(OTP_CONFIGS_TABLE, `${ACCOUNTS_TABLE}.otp_config_id`, `${OTP_CONFIGS_TABLE}.id`)
    .select(`${ACCOUNTS_TABLE}.id`, `${OTP_CONFIGS_TABLE}.otp_source`, `${OTP_CONFIGS_TABLE}.mail_backup_id`);
  for (const account of accounts) {
    let source = account.otp_source;
    if (source === "yuna") source = "imap";
    await knex(ACCOUNTS_TABLE).where("id", account.id).update({
      otp_source: source,
      mail_backup_id: account.mail_backup_id
    });
  }

  const tracks = await knex(TRACKING_TABLE)
    .join(OTP_CONFIGS_TABLE, `${TRACKING_TABLE}.otp_config_id`, `${OTP_CONFIGS_TABLE}.id`)
    .select(`${TRACKING_TABLE}.id`, `${OTP_CONFIGS_TABLE}.otp_source`);
  for (const track of tracks) {
    let source = track.otp_source;
    if (source === "yuna") source = "none";
    await knex(TRACKING_TABLE).where("id", track.id).update({
      otp_source: source
    });
  }

  // 4. Drop foreign keys, columns and table
  await knex.schema.alterTable(ACCOUNTS_TABLE, (table) => {
    table.dropColumn("otp_config_id");
  });
  await knex.schema.alterTable(TRACKING_TABLE, (table) => {
    table.dropColumn("otp_config_id");
  });

  await knex.schema.dropTableIfExists(OTP_CONFIGS_TABLE);
};
