/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.withSchema("warehouse").alterTable("product_names", (table) => {
    table.integer("product_id").unsigned();
  });

  await knex.raw(`
    UPDATE warehouse.product_names pn
    SET product_id = (
      SELECT product_id 
      FROM warehouse.stock_services ss 
      WHERE ss.name_id = pn.id 
      AND ss.product_id IS NOT NULL 
      LIMIT 1
    )
  `);

  await knex.schema.withSchema("warehouse").alterTable("stock_services", (table) => {
    table.dropColumn("product_id");
  });
};

exports.down = async function (knex) {
  await knex.schema.withSchema("warehouse").alterTable("stock_services", (table) => {
    table.integer("product_id").unsigned();
  });

  await knex.raw(`
    UPDATE warehouse.stock_services ss
    SET product_id = (
      SELECT product_id 
      FROM warehouse.product_names pn 
      WHERE pn.id = ss.name_id
    )
  `);

  await knex.schema.withSchema("warehouse").alterTable("product_names", (table) => {
    table.dropColumn("product_id");
  });
};