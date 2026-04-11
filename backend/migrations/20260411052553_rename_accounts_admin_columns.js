const TABLE = "system_automation.accounts_admin";

exports.up = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE} RENAME COLUMN "password_enc" TO "password_encrypted";
    ALTER TABLE ${TABLE} RENAME COLUMN "last_checked" TO "last_checked_at";
    ALTER TABLE ${TABLE} RENAME COLUMN "url_access" TO "access_url";
  `);
};

exports.down = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE ${TABLE} RENAME COLUMN "password_encrypted" TO "password_enc";
    ALTER TABLE ${TABLE} RENAME COLUMN "last_checked_at" TO "last_checked";
    ALTER TABLE ${TABLE} RENAME COLUMN "access_url" TO "url_access";
  `);
};
