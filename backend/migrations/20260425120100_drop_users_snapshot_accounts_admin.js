const TABLE = "system_automation.accounts_admin";

exports.up = async function up(knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      DROP COLUMN IF EXISTS users_snapshot;
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE}
      ADD COLUMN IF NOT EXISTS "users_snapshot" TEXT NULL;
  `);
};
