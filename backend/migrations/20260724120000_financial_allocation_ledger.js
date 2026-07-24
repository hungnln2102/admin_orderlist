exports.up = async function (knex) {
  await knex.schema.raw(`
    CREATE SCHEMA IF NOT EXISTS admin_finance;

    CREATE TABLE IF NOT EXISTS admin_finance.financial_allocation_ledger (
        id BIGSERIAL PRIMARY KEY,
        order_list_id INTEGER REFERENCES orders.order_list(id) ON DELETE CASCADE,
        id_order VARCHAR(50) NOT NULL,
        period_type VARCHAR(20) NOT NULL DEFAULT 'INITIAL',
        registration_date DATE NOT NULL,
        days INTEGER NOT NULL DEFAULT 0,
        cost NUMERIC(18,2) DEFAULT 0,
        price NUMERIC(18,2) DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_financial_allocation_ledger_order_list_id ON admin_finance.financial_allocation_ledger(order_list_id);
    CREATE INDEX IF NOT EXISTS idx_financial_allocation_ledger_id_order ON admin_finance.financial_allocation_ledger(id_order);
    CREATE INDEX IF NOT EXISTS idx_financial_allocation_ledger_registration_date ON admin_finance.financial_allocation_ledger(registration_date);

    -- Backfill from current order_list for all orders that have a registration_date
    INSERT INTO admin_finance.financial_allocation_ledger (
        order_list_id, id_order, period_type, registration_date, days, cost, price, created_at
    )
    SELECT 
        id, 
        id_order, 
        'INITIAL', 
        order_date, 
        COALESCE(NULLIF(regexp_replace(days, '\\D', '', 'g'), ''), '0')::integer, 
        COALESCE(cost, 0), 
        COALESCE(price, 0), 
        created_at
    FROM orders.order_list
    WHERE order_date IS NOT NULL 
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = async function (knex) {
  await knex.schema.raw(`
    DROP TABLE IF EXISTS admin_finance.financial_allocation_ledger CASCADE;
  `);
};
