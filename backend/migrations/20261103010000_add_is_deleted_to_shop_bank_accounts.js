const SCHEMA = "admin";
const TABLE = "shop_bank_accounts";

exports.up = async function up(knex) {
  await knex.schema.withSchema(SCHEMA).table(TABLE, (table) => {
    table.boolean("is_deleted").notNullable().defaultTo(false);
  });
};

exports.down = async function down(knex) {
  await knex.schema.withSchema(SCHEMA).table(TABLE, (table) => {
    table.dropColumn("is_deleted");
  });
};
