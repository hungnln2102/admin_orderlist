/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Add note to stock_services
  await knex.schema.withSchema("warehouse").alterTable("stock_services", (table) => {
    table.text("note");
  });

  // 2. Copy data from product_stocks to stock_services
  await knex.raw(`
    UPDATE warehouse.stock_services ss
    SET note = ps.note
    FROM warehouse.product_stocks ps
    WHERE ss.stock_id = ps.id 
      AND ps.note IS NOT NULL 
      AND ps.note != ''
  `);

  // 3. Drop columns from product_stocks
  const hasStatus = await knex.schema.withSchema("warehouse").hasColumn("product_stocks", "status");
  
  await knex.schema.withSchema("warehouse").alterTable("product_stocks", (table) => {
    table.dropColumn("note");
    table.dropColumn("is_verified");
    if (hasStatus) {
      table.dropColumn("status");
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Restore columns to product_stocks
  await knex.schema.withSchema("warehouse").alterTable("product_stocks", (table) => {
    table.text("note");
    table.boolean("is_verified").defaultTo(false);
  });

  // Try to copy data back (this is lossy since multiple services mapped to 1 stock)
  await knex.raw(`
    UPDATE warehouse.product_stocks ps
    SET note = ss.note
    FROM warehouse.stock_services ss
    WHERE ss.stock_id = ps.id
      AND ss.note IS NOT NULL
      AND ss.note != ''
  `);

  // Drop note from stock_services
  await knex.schema.withSchema("warehouse").alterTable("stock_services", (table) => {
    table.dropColumn("note");
  });
};
