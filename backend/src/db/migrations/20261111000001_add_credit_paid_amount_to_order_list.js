const schemaOrders = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || process.env.DB_SCHEMA_BUSINESS || "business";

exports.up = async function (knex) {
  await knex.schema.withSchema(schemaOrders).alterTable("order_list", (table) => {
    table.decimal("credit_paid_amount", 15, 2).notNullable().defaultTo(0);
  });
};

exports.down = async function (knex) {
  await knex.schema.withSchema(schemaOrders).alterTable("order_list", (table) => {
    table.dropColumn("credit_paid_amount");
  });
};