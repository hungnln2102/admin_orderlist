exports.up = async function (knex) {
  await knex.raw(`
    -- Date indexes for dashboard view queries
    CREATE INDEX IF NOT EXISTS idx_order_list_order_date ON business.order_list (order_date);
    CREATE INDEX IF NOT EXISTS idx_order_list_created_at ON business.order_list (created_at);
    CREATE INDEX IF NOT EXISTS idx_payment_receipt_payment_date ON billing.payment_receipt (payment_date);

    -- Functional indexes for LOWER expression matches in order list query
    CREATE INDEX IF NOT EXISTS idx_payment_receipt_id_order_lower ON billing.payment_receipt (LOWER(COALESCE(id_order, ''::text)));
    CREATE INDEX IF NOT EXISTS idx_order_list_id_order_lower ON business.order_list (LOWER(id_order));

    -- Foreign key indexes for lateral joins in order list query
    CREATE INDEX IF NOT EXISTS idx_refund_credit_notes_source_order_list_id ON billing.refund_credit_notes (source_order_list_id);
    CREATE INDEX IF NOT EXISTS idx_refund_credit_applications_target_order_list_id ON billing.refund_credit_applications (target_order_list_id);
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS business.idx_order_list_order_date;
    DROP INDEX IF EXISTS business.idx_order_list_created_at;
    DROP INDEX IF EXISTS billing.idx_payment_receipt_payment_date;
    DROP INDEX IF EXISTS billing.idx_payment_receipt_id_order_lower;
    DROP INDEX IF EXISTS business.idx_order_list_id_order_lower;
    DROP INDEX IF EXISTS billing.idx_refund_credit_notes_source_order_list_id;
    DROP INDEX IF EXISTS billing.idx_refund_credit_applications_target_order_list_id;
  `);
};
