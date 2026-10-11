const schemaOrders = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "business";

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaOrders}.order_list
      ADD COLUMN IF NOT EXISTS was_paid BOOLEAN DEFAULT FALSE;
  `);

  await knex.raw(`
    UPDATE ${schemaOrders}.order_list
    SET was_paid = TRUE
    WHERE status IN ('PAID', 'REFUND_PENDING', 'REFUNDED')
       OR id_order ILIKE 'MAVN%'
       OR id IN (
         SELECT order_list_id FROM ${schemaOrders}.supplier_order_cost_log WHERE order_list_id IS NOT NULL
       );
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE ${schemaOrders}.order_list
      DROP COLUMN IF EXISTS was_paid;
  `);
};
