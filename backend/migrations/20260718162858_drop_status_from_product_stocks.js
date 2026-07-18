/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.withSchema("warehouse").alterTable("product_stocks", (table) => {
    table.dropColumn("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.withSchema("warehouse").alterTable("product_stocks", (table) => {
    table.string("status", 20).defaultTo("Tồn Kho");
  });
};
