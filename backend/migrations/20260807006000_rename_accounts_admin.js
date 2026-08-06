exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE system_automation.accounts_admin RENAME TO system_bot_accounts;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE system_automation.system_bot_accounts RENAME TO accounts_admin;
  `);
};
