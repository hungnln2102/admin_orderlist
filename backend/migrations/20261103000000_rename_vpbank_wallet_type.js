const SCHEMA = "dashboard";
const TABLE_NAME = "master_wallettypes";

exports.up = async function up(knex) {
  await knex.withSchema(SCHEMA).table(TABLE_NAME)
    .where({ id: 3 })
    .orWhere({ wallet_name: "VP Bank (mavrykstore)" })
    .update({ wallet_name: "VP Bank (Cá nhân)" });
};

exports.down = async function down(knex) {
  await knex.withSchema(SCHEMA).table(TABLE_NAME)
    .where({ id: 3 })
    .orWhere({ wallet_name: "VP Bank (Cá nhân)" })
    .update({ wallet_name: "VP Bank (mavrykstore)" });
};
