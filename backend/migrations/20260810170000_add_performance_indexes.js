exports.up = async function (knex) {
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_order_list_order_date ON business.order_list (order_date);
    CREATE INDEX IF NOT EXISTS idx_order_list_created_at ON business.order_list (created_at);
    CREATE INDEX IF NOT EXISTS idx_payment_receipt_payment_date ON billing.payment_receipt (payment_date);
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS business.idx_order_list_order_date;
    DROP INDEX IF EXISTS business.idx_order_list_created_at;
    DROP INDEX IF EXISTS billing.idx_payment_receipt_payment_date;
  `);
};
