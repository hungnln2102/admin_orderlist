/**
 * Migration: Alter orders.order_list slot column from INT to VARCHAR(255)
 */
const schemaOrders = process.env.DB_SCHEMA_BUSINESS || "business";

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${schemaOrders}.order_list 
    ALTER COLUMN slot TYPE VARCHAR(255) USING slot::VARCHAR;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${schemaOrders}.order_list 
    ALTER COLUMN slot TYPE INT USING NULLIF(slot, '')::INT;
  `);
};
