/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Create product_names table
  await knex.schema.withSchema("warehouse").createTable("product_names", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable().unique();
    table.timestamps(true, true);
  });

  // 2. Add name_id to stock_services
  await knex.schema.withSchema("warehouse").alterTable("stock_services", (table) => {
    table.integer("name_id").unsigned().references("id").inTable("warehouse.product_names").onDelete("SET NULL");
  });

  // 3. Migrate data
  const services = await knex.withSchema("warehouse").table("stock_services")
    .select("id", "product_type_old")
    .whereNotNull("product_type_old")
    .andWhere("product_type_old", "!=", "");
    
  const uniqueNames = [...new Set(services.map(s => s.product_type_old))];

  for (const name of uniqueNames) {
    if (!name) continue;
    const [inserted] = await knex.withSchema("warehouse").table("product_names").insert({ name }).returning("id");
    const nameId = inserted.id ?? inserted;

    await knex.withSchema("warehouse").table("stock_services")
      .where("product_type_old", name)
      .update({ name_id: nameId });
  }

  // 4. Drop product_type_old
  await knex.schema.withSchema("warehouse").alterTable("stock_services", (table) => {
    table.dropColumn("product_type_old");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.withSchema("warehouse").alterTable("stock_services", (table) => {
    table.string("product_type_old");
  });

  const services = await knex.withSchema("warehouse").table("stock_services")
    .join("warehouse.product_names", "warehouse.stock_services.name_id", "warehouse.product_names.id")
    .select("warehouse.stock_services.id", "warehouse.product_names.name");

  for (const srv of services) {
    await knex.withSchema("warehouse").table("stock_services").where("id", srv.id).update({
      product_type_old: srv.name
    });
  }

  await knex.schema.withSchema("warehouse").alterTable("stock_services", (table) => {
    table.dropColumn("name_id");
  });

  await knex.schema.withSchema("warehouse").dropTable("product_names");
};
