const { loadBackendEnv } = require("@/config/loadEnv");

loadBackendEnv();

const pickSchema = (...c) => c.find(Boolean);

const ident = (name) => {
  const s = String(name || "").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return s;
};

exports.up = async function up(knex) {
  const rec = ident(
    pickSchema(process.env.DB_SCHEMA_RECEIPT, process.env.SCHEMA_RECEIPT, "receipt")
  );

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS "${rec}".receipt_flow_types (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'neutral')),
      effect TEXT NOT NULL CHECK (effect IN ('order_match', 'off_flow_revenue', 'withdrawal', 'import_order', 'ignore')),
      is_system BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO "${rec}".receipt_flow_types (code, label, direction, effect, is_system, sort_order)
    VALUES
      ('order_match', 'Ghép đơn hàng', 'in', 'order_match', true, 1),
      ('off_flow_revenue', 'Doanh thu ngoài luồng', 'in', 'off_flow_revenue', true, 2),
      ('withdrawal', 'Rút tiền / Chuyển ra', 'out', 'withdrawal', true, 3),
      ('import_order', 'Nhập đơn / Thanh toán NCC', 'out', 'import_order', true, 4),
      ('ignore', 'Bỏ qua', 'neutral', 'ignore', true, 5)
    ON CONFLICT (code) DO NOTHING;

    ALTER TABLE "${rec}".payment_receipt_financial_state
      ADD COLUMN IF NOT EXISTS flow_type_id INT REFERENCES "${rec}".receipt_flow_types(id),
      ADD COLUMN IF NOT EXISTS flow_classified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS flow_note TEXT;
  `);
};

exports.down = async function down(knex) {
  const rec = ident(
    pickSchema(process.env.DB_SCHEMA_RECEIPT, process.env.SCHEMA_RECEIPT, "receipt")
  );

  await knex.raw(`
    ALTER TABLE "${rec}".payment_receipt_financial_state
      DROP COLUMN IF EXISTS flow_type_id,
      DROP COLUMN IF EXISTS flow_classified_at,
      DROP COLUMN IF EXISTS flow_note;

    DROP TABLE IF EXISTS "${rec}".receipt_flow_types;
  `);
};
