/**
 * Tiền NH nhận **ngoài luồng doanh thu** (biên lai không gắn DT/LN): webhook không mã đơn,
 * và tiền thừa sau khi đơn đã PAID (biên lai bổ sung).
 */
const { loadBackendEnv } = require("../src/config/loadEnv");

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
  const fin = ident(
    pickSchema(process.env.DB_SCHEMA_FINANCE, process.env.SCHEMA_FINANCE, "dashboard")
  );
  const rec = ident(
    pickSchema(process.env.DB_SCHEMA_RECEIPT, process.env.SCHEMA_RECEIPT, "receipt")
  );

  await knex.raw(`
    ALTER TABLE "${fin}".dashboard_monthly_summary
      ADD COLUMN IF NOT EXISTS total_off_flow_bank_receipt NUMERIC(18,2) NOT NULL DEFAULT 0;

    ALTER TABLE "${rec}".payment_receipt_financial_state
      ADD COLUMN IF NOT EXISTS posted_off_flow_bank_receipt NUMERIC(18,2) NOT NULL DEFAULT 0;
  `);
};

exports.down = async function down(knex) {
  const fin = ident(
    pickSchema(process.env.DB_SCHEMA_FINANCE, process.env.SCHEMA_FINANCE, "dashboard")
  );
  const rec = ident(
    pickSchema(process.env.DB_SCHEMA_RECEIPT, process.env.SCHEMA_RECEIPT, "receipt")
  );

  await knex.raw(`
    ALTER TABLE "${fin}".dashboard_monthly_summary
      DROP COLUMN IF EXISTS total_off_flow_bank_receipt;

    ALTER TABLE "${rec}".payment_receipt_financial_state
      DROP COLUMN IF EXISTS posted_off_flow_bank_receipt;
  `);
};
